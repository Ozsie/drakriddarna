import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { appendFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { cpus, platform, release, tmpdir, totalmem } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import type {
  BrowserTraceEvent,
  FrameTimeSummary,
  TraceSummary,
} from '../src/perf/browserBenchmarkMetrics.ts';
import {
  compareMetricBudgets,
  summarizeFrameIntervals,
  summarizeTraceEvents,
} from '../src/perf/browserBenchmarkMetrics.ts';

interface Options {
  headed: boolean;
  url?: string;
  out?: string;
  baseline?: string;
  recordBaseline?: string;
  idleMs: number;
  interactionMs: number;
  churn: number;
  width: number;
  height: number;
  dprs: number[];
  projections: Array<'topDown' | 'isometric'>;
  dungeons: Array<'e1m5' | 'testingGrounds'>;
}

interface CdpMessage {
  id?: number;
  result?: Record<string, unknown>;
  error?: { message?: string };
  method?: string;
  params?: Record<string, unknown>;
  sessionId?: string;
}

interface CdpEvent {
  params: Record<string, unknown>;
  sessionId?: string;
}

interface CdpPending {
  resolve: (result: Record<string, unknown>) => void;
  reject: (error: Error) => void;
}

interface CdpListener {
  callback: (event: CdpEvent) => void;
  sessionId?: string;
}

interface LoadMeasurement {
  readyMs: number;
  decodeMs: number;
  decodedImageTasks: number;
}

interface LoadMeasurementResult {
  measurement: LoadMeasurement;
  hasNavigated: boolean;
  traceEvents: BrowserTraceEvent[];
}

interface PhaseMeasurement {
  frames: FrameTimeSummary;
  traceEvents: BrowserTraceEvent[];
}

interface ChurnMeasurement {
  iteration: number;
  dungeonId: 'e1m5' | 'testingGrounds';
  heapBeforeLoadBytes: number | null;
  heapBeforeGcBytes: number | null;
  usedHeapBytes: number | null;
  allocationBytes: number | null;
  reclaimedBytes: number | null;
  domNodes: number;
  eventListeners: number;
}

interface ScenarioResult {
  id: string;
  dungeonId: 'e1m5' | 'testingGrounds';
  projection: 'topDown' | 'isometric';
  dpr: number;
  seed: number;
  boardSize: unknown;
  coldLoad: LoadMeasurement;
  warmLoad: LoadMeasurement;
  idle: FrameTimeSummary;
  pan: FrameTimeSummary;
  zoom: FrameTimeSummary;
  trace: TraceSummary;
}

interface BenchmarkReport {
  recordedAt: string;
  environment: Record<string, unknown>;
  scenarios: ScenarioResult[];
  dungeonChurn: ChurnMeasurement[];
  baselineComparison?: {
    regressions: Array<{
      scenario: string;
      metric: string;
      actual: number;
      budget: number;
    }>;
  };
}

class CdpConnection {
  private readonly socket: WebSocket;
  private nextId = 1;
  private readonly pending = new Map<number, CdpPending>();
  private readonly listeners = new Map<string, Set<CdpListener>>();

  private constructor(socket: WebSocket) {
    this.socket = socket;
    socket.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') return;
      const message = JSON.parse(event.data) as CdpMessage;
      if (message.id !== undefined) {
        const request = this.pending.get(message.id);
        if (!request) return;
        this.pending.delete(message.id);
        if (message.error) {
          request.reject(
            new Error(message.error.message ?? 'CDP request failed'),
          );
        } else {
          request.resolve(message.result ?? {});
        }
        return;
      }
      if (!message.method) return;
      const eventMessage: CdpEvent = {
        params: message.params ?? {},
        sessionId: message.sessionId,
      };
      this.listeners.get(message.method)?.forEach((listener) => {
        if (
          listener.sessionId === undefined ||
          listener.sessionId === eventMessage.sessionId
        ) {
          listener.callback(eventMessage);
        }
      });
    });
    socket.addEventListener('close', () => {
      this.pending.forEach((request) =>
        request.reject(new Error('Chrome DevTools connection closed')),
      );
      this.pending.clear();
    });
    socket.addEventListener('error', () => {
      this.pending.forEach((request) =>
        request.reject(new Error('Chrome DevTools connection failed')),
      );
      this.pending.clear();
    });
  }

  static connect(url: string): Promise<CdpConnection> {
    if (typeof WebSocket === 'undefined') {
      return Promise.reject(
        new Error('This Node.js runtime does not provide global WebSocket'),
      );
    }
    const socket = new WebSocket(url);
    return new Promise((resolvePromise, rejectPromise) => {
      socket.addEventListener('open', () =>
        resolvePromise(new CdpConnection(socket)),
      );
      socket.addEventListener('error', () =>
        rejectPromise(new Error('Could not connect to Chrome DevTools')),
      );
    });
  }

  send(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string,
  ): Promise<Record<string, unknown>> {
    const id = this.nextId++;
    const message: Record<string, unknown> = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    return new Promise((resolvePromise, rejectPromise) => {
      this.pending.set(id, {
        resolve: resolvePromise,
        reject: rejectPromise,
      });
      this.socket.send(JSON.stringify(message));
    });
  }

  on(
    method: string,
    callback: (event: CdpEvent) => void,
    sessionId?: string,
  ): () => void {
    const listeners = this.listeners.get(method) ?? new Set<CdpListener>();
    const listener = { callback, sessionId };
    listeners.add(listener);
    this.listeners.set(method, listeners);
    return () => listeners.delete(listener);
  }

  waitForEvent(
    method: string,
    sessionId: string | undefined,
    timeoutMs: number,
  ): Promise<CdpEvent> {
    return new Promise((resolvePromise, rejectPromise) => {
      const timeout = setTimeout(() => {
        unsubscribe();
        rejectPromise(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
      const unsubscribe = this.on(
        method,
        (event) => {
          clearTimeout(timeout);
          unsubscribe();
          resolvePromise(event);
        },
        sessionId,
      );
    });
  }

  close(): void {
    this.socket.close();
  }
}

const parseNumberList = (value: string, option: string): number[] => {
  const parsed = value.split(',').map(Number);
  if (parsed.some((number) => !Number.isFinite(number) || number <= 0)) {
    throw new Error(`Invalid value for ${option}: ${value}`);
  }
  return parsed;
};

const parseOptions = (args: string[]): Options => {
  const options: Options = {
    headed: false,
    idleMs: 3000,
    interactionMs: 1600,
    churn: 10,
    width: 1440,
    height: 960,
    dprs: [1, 2, 3],
    projections: ['topDown', 'isometric'],
    dungeons: ['e1m5', 'testingGrounds'],
  };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--headed') options.headed = true;
    else if (arg === '--url') options.url = args[++index];
    else if (arg === '--out') options.out = args[++index];
    else if (arg === '--baseline') options.baseline = args[++index];
    else if (arg === '--record-baseline')
      options.recordBaseline = args[++index];
    else if (arg === '--idle-ms') options.idleMs = Number(args[++index]);
    else if (arg === '--interaction-ms') {
      options.interactionMs = Number(args[++index]);
    } else if (arg === '--churn') options.churn = Number(args[++index]);
    else if (arg === '--width') options.width = Number(args[++index]);
    else if (arg === '--height') options.height = Number(args[++index]);
    else if (arg === '--dprs')
      options.dprs = parseNumberList(args[++index] ?? '', arg);
    else if (arg === '--projections') {
      const projections = (args[++index] ?? '').split(',');
      if (
        projections.some(
          (projection) =>
            projection !== 'topDown' && projection !== 'isometric',
        )
      ) {
        throw new Error(`Invalid projection list: ${projections.join(',')}`);
      }
      options.projections = projections as Array<'topDown' | 'isometric'>;
    } else if (arg === '--dungeons') {
      const dungeons = (args[++index] ?? '').split(',');
      if (
        dungeons.some(
          (dungeon) => dungeon !== 'e1m5' && dungeon !== 'testingGrounds',
        )
      ) {
        throw new Error(`Invalid dungeon list: ${dungeons.join(',')}`);
      }
      options.dungeons = dungeons as Array<'e1m5' | 'testingGrounds'>;
    } else if (arg === '--help') {
      process.stdout.write(
        [
          'Browser performance benchmark options:',
          '  --url URL                 Use an existing production-preview URL',
          '  --headed                  Show Chrome instead of running headless',
          '  --out PATH                Write PATH.json and PATH.txt reports',
          '  --baseline PATH           Compare against a baseline JSON file',
          '  --record-baseline PATH    Write measured values and budgets',
          '  --idle-ms N               Idle frame sample duration (default 3000)',
          '  --interaction-ms N        Pan/zoom sample duration (default 1600)',
          '  --churn N                 Alternating dungeon changes (default 10)',
          '  --dprs LIST               Comma-separated DPRs (default 1,2,3)',
          '  --projections LIST        Comma-separated modes (default topDown,isometric)',
          '  --dungeons LIST           Comma-separated maps (default e1m5,testingGrounds)',
        ].join('\n') + '\n',
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  if (
    [
      options.idleMs,
      options.interactionMs,
      options.churn,
      options.width,
      options.height,
    ].some((value) => !Number.isFinite(value) || value <= 0)
  ) {
    throw new Error(
      'Durations, churn count, and viewport dimensions must be positive',
    );
  }
  return options;
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

const acquirePort = async (): Promise<number> => {
  const server = createServer();
  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(0, '127.0.0.1', () => resolvePromise());
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Could not allocate a local TCP port');
  }
  const port = address.port;
  await new Promise<void>((resolvePromise, rejectPromise) =>
    server.close((error) => (error ? rejectPromise(error) : resolvePromise())),
  );
  return port;
};

const waitForHttp = async (
  url: string,
  child?: ChildProcess,
): Promise<void> => {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) {
      throw new Error(`Preview server exited with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await delay(100);
    }
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const startPreview = async (): Promise<{
  child: ChildProcess;
  url: string;
}> => {
  const port = await acquirePort();
  const child = spawn(
    process.execPath,
    [
      join(process.cwd(), 'node_modules/vite/bin/vite.js'),
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let serverOutput = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    serverOutput += chunk.toString();
  });
  const url = `http://127.0.0.1:${String(port)}/drakriddarna/`;
  try {
    await waitForHttp(url, child);
  } catch (error) {
    await stopChild(child);
    throw new Error(`${String(error)}\n${serverOutput}`, { cause: error });
  }
  return { child, url };
};

const findChrome = (): string => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates =
    platform() === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : [
          '/usr/bin/google-chrome',
          '/usr/bin/chromium',
          '/usr/bin/chromium-browser',
          '/snap/bin/chromium',
        ];
  const chrome = candidates.find((candidate) => existsSync(candidate));
  if (!chrome) {
    throw new Error(
      'Chrome/Chromium not found; set CHROME_PATH to its executable',
    );
  }
  return chrome;
};

const startChrome = async (
  headed: boolean,
): Promise<{ child: ChildProcess; profile: string; debugPort: number }> => {
  const chrome = findChrome();
  const profile = await mkdtemp(
    join(tmpdir(), 'drakriddarna-browser-benchmark-'),
  );
  const debugPort = await acquirePort();
  const args = [
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${String(debugPort)}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-extensions',
    '--remote-allow-origins=*',
    '--enable-precise-memory-info',
    '--js-flags=--expose-gc',
    `--window-size=${String(1440)},${String(960)}`,
    'about:blank',
  ];
  if (!headed) args.unshift('--headless=new');
  const child = spawn(chrome, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  return { child, profile, debugPort };
};

const waitForChrome = async (
  debugPort: number,
  child: ChildProcess,
): Promise<Record<string, unknown>> => {
  const endpoint = `http://127.0.0.1:${String(debugPort)}/json/version`;
  const deadline = Date.now() + 30000;
  let errorText = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    errorText += chunk.toString();
  });
  while (Date.now() < deadline) {
    if (child.exitCode !== null && child.exitCode !== undefined) {
      throw new Error(
        `Chrome exited with code ${child.exitCode}\n${errorText}`,
      );
    }
    try {
      const response = await fetch(endpoint);
      if (response.ok)
        return (await response.json()) as Record<string, unknown>;
    } catch {
      await delay(100);
    }
  }
  throw new Error(`Timed out waiting for Chrome DevTools\n${errorText}`);
};

const evaluate = async <T>(
  cdp: CdpConnection,
  sessionId: string,
  expression: string,
  awaitPromise = true,
): Promise<T> => {
  const response = await cdp.send(
    'Runtime.evaluate',
    {
      expression,
      awaitPromise,
      returnByValue: true,
      userGesture: true,
    },
    sessionId,
  );
  const result = response.result as
    { value?: T; description?: string } | undefined;
  if (response.exceptionDetails) {
    const details = response.exceptionDetails as {
      text?: string;
      exception?: { description?: string; className?: string };
    };
    const exception = details.exception?.description;
    throw new Error(
      [details.text ?? 'Page evaluation failed', exception]
        .filter(Boolean)
        .join(': '),
    );
  }
  return result?.value as T;
};

const preloadSource = `try {
  localStorage.setItem('perfHarness', '1');
  localStorage.setItem('appSettings', JSON.stringify({
    musicOn: false, sfxOn: false, musicVolume: 0, sfxVolume: 0,
    debugOn: false, renderMode: 'topDown'
  }));
} catch {}`;

const beginTracing = async (
  cdp: CdpConnection,
  sessionId: string,
): Promise<{
  events: BrowserTraceEvent[];
  stop: () => Promise<BrowserTraceEvent[]>;
}> => {
  const events: BrowserTraceEvent[] = [];
  const unsubscribe = cdp.on(
    'Tracing.dataCollected',
    (event) => {
      const values = event.params.value;
      if (!Array.isArray(values)) return;
      values.forEach((value) => {
        if (typeof value === 'object' && value !== null) {
          const traceEvent = value as Partial<BrowserTraceEvent>;
          if (typeof traceEvent.name === 'string') {
            events.push(traceEvent as BrowserTraceEvent);
          }
        }
      });
    },
    sessionId,
  );
  await cdp.send(
    'Tracing.start',
    {
      categories:
        'devtools.timeline,blink,cc,gpu,v8,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,disabled-by-default-devtools.timeline.image-decode,disabled-by-default-v8.gc,disabled-by-default-cc.debug',
      transferMode: 'ReportEvents',
    },
    sessionId,
  );
  return {
    events,
    stop: async () => {
      const complete = cdp.waitForEvent(
        'Tracing.tracingComplete',
        sessionId,
        15000,
      );
      await cdp.send('Tracing.end', {}, sessionId);
      await complete;
      unsubscribe();
      return events;
    },
  };
};

const waitForHarness = async (
  cdp: CdpConnection,
  sessionId: string,
): Promise<void> => {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    try {
      if (
        await evaluate<boolean>(
          cdp,
          sessionId,
          'Boolean(window.__drakriddarnaPerf)',
        )
      ) {
        return;
      }
    } catch {
      // The execution context can be replaced while navigation is completing.
    }
    await delay(100);
  }
  throw new Error('The opt-in browser benchmark harness did not load');
};

const callHarness = async <T>(
  cdp: CdpConnection,
  sessionId: string,
  method: 'loadScenario' | 'ready' | 'boardSize',
  argument?: Record<string, unknown>,
): Promise<T> => {
  const args = argument ? JSON.stringify(argument) : '';
  return evaluate<T>(
    cdp,
    sessionId,
    `window.__drakriddarnaPerf.${method}(${args})`,
  );
};

const runLoadMeasurement = async (
  cdp: CdpConnection,
  sessionId: string,
  url: string,
  scenario: Record<string, unknown>,
  cold: boolean,
  hasNavigated: boolean,
): Promise<LoadMeasurementResult> => {
  if (cold) {
    if (hasNavigated) {
      await evaluate<void>(
        cdp,
        sessionId,
        "localStorage.removeItem('reloadGuard')",
      );
    }
    await cdp.send('Network.clearBrowserCache', {}, sessionId);
  }
  const trace = await beginTracing(cdp, sessionId);
  const started = performance.now();
  const documentLoaded = cdp.waitForEvent(
    'Page.loadEventFired',
    sessionId,
    45000,
  );
  if (hasNavigated) {
    await cdp.send('Page.reload', { ignoreCache: cold }, sessionId);
  } else {
    await cdp.send('Page.navigate', { url }, sessionId);
  }
  await documentLoaded;
  await waitForHarness(cdp, sessionId);
  await callHarness<unknown>(cdp, sessionId, 'loadScenario', scenario);
  await callHarness<unknown>(cdp, sessionId, 'ready');
  const readyMs = performance.now() - started;
  const traceEvents = await trace.stop();
  const imageDecodeEvents = traceEvents.filter(
    (event) =>
      event.name === 'Decode Image' || event.name === 'ImageDecodeTask',
  );
  const decode = summarizeTraceEvents(imageDecodeEvents);
  return {
    measurement: {
      readyMs,
      decodeMs: decode.imageDecodeMs,
      decodedImageTasks: imageDecodeEvents.length,
    },
    hasNavigated: true,
    traceEvents,
  };
};

const beginFrameCapture = async (
  cdp: CdpConnection,
  sessionId: string,
  durationMs: number,
): Promise<void> => {
  await evaluate<void>(
    cdp,
    sessionId,
    `globalThis.__drakriddarnaFrameIntervals = new Promise((resolve) => {
      const intervals = [];
      const start = performance.now();
      let previous;
      const frame = (timestamp) => {
        if (previous !== undefined) intervals.push(timestamp - previous);
        previous = timestamp;
        if (timestamp - start >= ${String(durationMs)}) resolve(intervals);
        else requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }); 'started';`,
    false,
  );
};

const finishFrameCapture = async (
  cdp: CdpConnection,
  sessionId: string,
): Promise<FrameTimeSummary> => {
  const intervals = await evaluate<number[]>(
    cdp,
    sessionId,
    'globalThis.__drakriddarnaFrameIntervals',
  );
  return summarizeFrameIntervals(intervals);
};

const getBoardSize = (
  cdp: CdpConnection,
  sessionId: string,
): Promise<{
  left: number;
  top: number;
  width: number;
  height: number;
}> => callHarness(cdp, sessionId, 'boardSize');

const dispatchPan = async (
  cdp: CdpConnection,
  sessionId: string,
  board: { left: number; top: number; width: number; height: number },
): Promise<void> => {
  let x = board.left + board.width / 2;
  let y = board.top + board.height / 2;
  await cdp.send(
    'Input.dispatchMouseEvent',
    { type: 'mousePressed', x, y, button: 'right', buttons: 2, clickCount: 1 },
    sessionId,
  );
  for (let index = 1; index <= 8; index++) {
    await delay(75);
    x += 8;
    y += index % 2 === 0 ? 4 : -4;
    await cdp.send(
      'Input.dispatchMouseEvent',
      { type: 'mouseMoved', x, y, button: 'none', buttons: 2 },
      sessionId,
    );
  }
  await cdp.send(
    'Input.dispatchMouseEvent',
    { type: 'mouseReleased', x, y, button: 'right', buttons: 0, clickCount: 1 },
    sessionId,
  );
};

const dispatchZoom = async (
  cdp: CdpConnection,
  sessionId: string,
  board: { left: number; top: number; width: number; height: number },
): Promise<void> => {
  const x = board.left + board.width / 2;
  const y = board.top + board.height / 2;
  for (let index = 0; index < 6; index++) {
    await delay(90);
    await cdp.send(
      'Input.dispatchMouseEvent',
      {
        type: 'mouseWheel',
        x,
        y,
        deltaX: 0,
        deltaY: index < 3 ? -120 : 120,
        buttons: 0,
      },
      sessionId,
    );
  }
};

const measurePhase = async (
  cdp: CdpConnection,
  sessionId: string,
  durationMs: number,
  interact?: () => Promise<void>,
): Promise<PhaseMeasurement> => {
  const tracing = await beginTracing(cdp, sessionId);
  await beginFrameCapture(cdp, sessionId, durationMs);
  if (interact) await interact();
  const frames = await finishFrameCapture(cdp, sessionId);
  const traceEvents = await tracing.stop();
  return { frames, traceEvents };
};

const flattenScenarioMetrics = (
  scenario: ScenarioResult,
): Record<string, number> => ({
  'coldLoad.readyMs': scenario.coldLoad.readyMs,
  'warmLoad.readyMs': scenario.warmLoad.readyMs,
  'coldLoad.decodeMs': scenario.coldLoad.decodeMs,
  'warmLoad.decodeMs': scenario.warmLoad.decodeMs,
  'idle.p50Ms': scenario.idle.p50Ms,
  'idle.p95Ms': scenario.idle.p95Ms,
  'idle.p99Ms': scenario.idle.p99Ms,
  'idle.maxMs': scenario.idle.maxMs,
  'idle.longFrames': scenario.idle.longFrames,
  'pan.p50Ms': scenario.pan.p50Ms,
  'pan.p95Ms': scenario.pan.p95Ms,
  'pan.p99Ms': scenario.pan.p99Ms,
  'pan.maxMs': scenario.pan.maxMs,
  'pan.longFrames': scenario.pan.longFrames,
  'zoom.p50Ms': scenario.zoom.p50Ms,
  'zoom.p95Ms': scenario.zoom.p95Ms,
  'zoom.p99Ms': scenario.zoom.p99Ms,
  'zoom.maxMs': scenario.zoom.maxMs,
  'zoom.longFrames': scenario.zoom.longFrames,
  'trace.rasterTaskMs': scenario.trace.rasterTaskMs,
  'trace.paintMs': scenario.trace.paintMs,
  'trace.blinkPaintMs': scenario.trace.blinkPaintMs,
  'trace.compositeLayersMs': scenario.trace.compositeLayersMs,
  'trace.imageDecodeMs': scenario.trace.imageDecodeMs,
  'trace.gpuTaskMs': scenario.trace.gpuTaskMs,
  'trace.minorGcCount': scenario.trace.minorGcCount,
  'trace.majorGcCount': scenario.trace.majorGcCount,
  'trace.gcDurationMs': scenario.trace.gcDurationMs,
});

const flattenChurnMetrics = (
  measurement: ChurnMeasurement,
): Record<string, number> => {
  const metrics: Record<string, number> = {
    domNodes: measurement.domNodes,
    eventListeners: measurement.eventListeners,
  };
  if (measurement.usedHeapBytes !== null) {
    metrics.usedHeapBytes = measurement.usedHeapBytes;
  }
  if (measurement.allocationBytes !== null) {
    metrics.allocationBytes = measurement.allocationBytes;
  }
  if (measurement.reclaimedBytes !== null) {
    metrics.reclaimedBytes = measurement.reclaimedBytes;
  }
  return metrics;
};

const getRemoteObjectId = async (
  cdp: CdpConnection,
  sessionId: string,
  expression: string,
): Promise<string> => {
  const response = await cdp.send(
    'Runtime.evaluate',
    {
      expression,
      returnByValue: false,
      objectGroup: 'browser-benchmark-listeners',
    },
    sessionId,
  );
  const result = response.result as { objectId?: string } | undefined;
  if (!result?.objectId) {
    throw new Error(`Could not get a remote object for ${expression}`);
  }
  return result.objectId;
};

const getEventListenerCount = async (
  cdp: CdpConnection,
  sessionId: string,
): Promise<number> => {
  try {
    const [documentId, windowId] = await Promise.all([
      getRemoteObjectId(cdp, sessionId, 'document'),
      getRemoteObjectId(cdp, sessionId, 'window'),
    ]);
    const [documentResult, windowResult] = await Promise.all([
      cdp.send(
        'DOMDebugger.getEventListeners',
        { objectId: documentId, depth: -1, pierce: true },
        sessionId,
      ),
      cdp.send(
        'DOMDebugger.getEventListeners',
        { objectId: windowId },
        sessionId,
      ),
    ]);
    const documentListeners = Array.isArray(documentResult.listeners)
      ? documentResult.listeners.length
      : 0;
    const windowListeners = Array.isArray(windowResult.listeners)
      ? windowResult.listeners.length
      : 0;
    return documentListeners + windowListeners;
  } finally {
    await cdp.send(
      'Runtime.releaseObjectGroup',
      { objectGroup: 'browser-benchmark-listeners' },
      sessionId,
    );
  }
};

const roundBudget = (value: number, metric: string): number => {
  let multiplier = 1.25;
  let margin = 1;
  if (metric.endsWith('readyMs')) {
    multiplier = 1.5;
    margin = 100;
  } else if (metric.toLowerCase().includes('decodems')) {
    multiplier = 1.5;
    margin = 5;
  } else if (metric.endsWith('Ms')) {
    margin = 2;
  } else if (metric.endsWith('Bytes')) {
    margin = 256 * 1024;
  }
  return Math.round((value * multiplier + margin) * 100) / 100;
};

const collectChurn = async (
  cdp: CdpConnection,
  sessionId: string,
  churn: number,
): Promise<ChurnMeasurement[]> => {
  await cdp.send('HeapProfiler.enable', {}, sessionId);
  const results: ChurnMeasurement[] = [];
  for (let index = 0; index < churn; index++) {
    const dungeonId = index % 2 === 0 ? 'e1m5' : 'testingGrounds';
    const beforeLoad = await evaluate<number | null>(
      cdp,
      sessionId,
      'performance.memory ? performance.memory.usedJSHeapSize : null',
    );
    await callHarness<unknown>(cdp, sessionId, 'loadScenario', {
      campaignId: 'iceDragonTreasure',
      dungeonId,
      seed: 9000 + index,
      explored: true,
      projection: 'topDown',
    });
    const beforeGc = await evaluate<number | null>(
      cdp,
      sessionId,
      'performance.memory ? performance.memory.usedJSHeapSize : null',
    );
    await cdp.send('HeapProfiler.collectGarbage', {}, sessionId);
    const memory = await evaluate<{
      usedHeapBytes: number | null;
      domNodes: number;
    }>(
      cdp,
      sessionId,
      `({
        usedHeapBytes: performance.memory ? performance.memory.usedJSHeapSize : null,
        domNodes: document.querySelectorAll('*').length
      })`,
    );
    const eventListeners = await getEventListenerCount(cdp, sessionId);
    results.push({
      iteration: index + 1,
      dungeonId,
      heapBeforeLoadBytes: beforeLoad,
      heapBeforeGcBytes: beforeGc,
      ...memory,
      eventListeners,
      allocationBytes:
        beforeGc !== null && beforeLoad !== null
          ? Math.max(0, beforeGc - beforeLoad)
          : null,
      reclaimedBytes:
        beforeGc !== null && memory.usedHeapBytes !== null
          ? Math.max(0, beforeGc - memory.usedHeapBytes)
          : null,
    });
  }
  await cdp.send('HeapProfiler.disable', {}, sessionId);
  return results;
};

const getGitCommit = (): string | null => {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
};

const isGitWorkingTreeDirty = (): boolean | null => {
  try {
    return (
      execFileSync('git', ['status', '--porcelain'], {
        encoding: 'utf8',
      }).trim().length > 0
    );
  } catch {
    return null;
  }
};

const formatDuration = (value: number): string => `${value.toFixed(2)} ms`;

const formatTextReport = (report: BenchmarkReport): string => {
  const environment = report.environment;
  const graphicsSummary =
    typeof environment.graphicsSummary === 'string'
      ? environment.graphicsSummary
      : 'unavailable';
  const lines = [
    'Real-browser performance baseline',
    `Recorded: ${report.recordedAt}`,
    `Browser: ${String(environment.browser)} (${String(environment.userAgent)})`,
    `Host: ${String(environment.os)}; ${String(environment.cpu)}; headless=${String(environment.headless)}`,
    `Graphics: ${graphicsSummary}`,
    `Git commit: ${typeof environment.gitCommit === 'string' ? environment.gitCommit : 'unavailable'}`,
    '',
    'Scenario metrics (frame intervals in milliseconds):',
    '| Scenario | Load cold/warm | Decode cold/warm | Idle p95/p99/max | Pan p95/p99/max | Zoom p95/p99/max | Raster / paint / composite |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];
  report.scenarios.forEach((scenario) => {
    lines.push(
      `| ${scenario.id} | ${formatDuration(scenario.coldLoad.readyMs)} / ${formatDuration(scenario.warmLoad.readyMs)} | ${formatDuration(scenario.coldLoad.decodeMs)} / ${formatDuration(scenario.warmLoad.decodeMs)} | ${scenario.idle.p95Ms.toFixed(2)} / ${scenario.idle.p99Ms.toFixed(2)} / ${scenario.idle.maxMs.toFixed(2)} | ${scenario.pan.p95Ms.toFixed(2)} / ${scenario.pan.p99Ms.toFixed(2)} / ${scenario.pan.maxMs.toFixed(2)} | ${scenario.zoom.p95Ms.toFixed(2)} / ${scenario.zoom.p99Ms.toFixed(2)} / ${scenario.zoom.maxMs.toFixed(2)} | ${scenario.trace.rasterTaskMs.toFixed(2)} / ${scenario.trace.paintMs.toFixed(2)} / ${scenario.trace.compositeLayersMs.toFixed(2)} ms |`,
    );
  });
  lines.push('', 'Dungeon-churn memory after forced GC:');
  report.dungeonChurn.forEach((measurement) => {
    lines.push(
      `- ${measurement.iteration}: ${measurement.dungeonId}, heap=${measurement.usedHeapBytes ?? 'unavailable'}, allocated delta=${measurement.allocationBytes ?? 'unavailable'}, reclaimed=${measurement.reclaimedBytes ?? 'unavailable'}, DOM=${measurement.domNodes}, event listeners=${measurement.eventListeners}`,
    );
  });
  if (report.baselineComparison) {
    lines.push('', 'Baseline comparison:');
    if (report.baselineComparison.regressions.length === 0) {
      lines.push('- No measured metrics exceeded their budgets.');
    } else {
      report.baselineComparison.regressions.forEach((regression) => {
        lines.push(
          `- ${regression.scenario}.${regression.metric}: ${regression.actual} > ${regression.budget}`,
        );
      });
    }
  }
  lines.push(
    '',
    'Trace values are event-duration totals; Chrome may omit GPU or GC details depending on the graphics backend and trace category support.',
  );
  return lines.join('\n');
};

const outputPaths = (path: string): { json: string; text: string } => {
  const absolute = resolve(path);
  const extension = extname(absolute);
  const prefix = extension ? absolute.slice(0, -extension.length) : absolute;
  return { json: `${prefix}.json`, text: `${prefix}.txt` };
};

const writeReport = async (
  report: BenchmarkReport,
  out?: string,
): Promise<void> => {
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const text = `${formatTextReport(report)}\n`;
  if (out) {
    const paths = outputPaths(out);
    await writeFile(paths.json, json);
    await writeFile(paths.text, text);
    process.stdout.write(`Wrote ${paths.json} and ${paths.text}\n`);
  } else {
    process.stdout.write(`${text}\n${json}`);
  }
  const reportFile = process.env.BENCHMARK_REPORT_FILE;
  if (reportFile) {
    await appendFile(reportFile, text);
    await writeFile(`${reportFile}.json`, json);
  }
};

const readBaseline = async (
  path: string,
): Promise<{
  budgets?: Record<string, Record<string, number>>;
  churnBudgets?: Array<Record<string, number>>;
}> =>
  JSON.parse(await readFile(path, 'utf8')) as {
    budgets?: Record<string, Record<string, number>>;
    churnBudgets?: Array<Record<string, number>>;
  };

const recordBaseline = async (
  path: string,
  report: BenchmarkReport,
): Promise<void> => {
  const budgets: Record<string, Record<string, number>> = {};
  const measured: Record<string, Record<string, number>> = {};
  report.scenarios.forEach((scenario) => {
    const metrics = flattenScenarioMetrics(scenario);
    measured[scenario.id] = metrics;
    budgets[scenario.id] = Object.fromEntries(
      Object.entries(metrics).map(([metric, value]) => [
        metric,
        roundBudget(value, metric),
      ]),
    );
  });
  const measuredChurn = report.dungeonChurn.map(flattenChurnMetrics);
  const churnBudgets = measuredChurn.map((metrics) =>
    Object.fromEntries(
      Object.entries(metrics).map(([metric, value]) => [
        metric,
        roundBudget(value, metric),
      ]),
    ),
  );
  const baseline = {
    recordedAt: report.recordedAt,
    environment: report.environment,
    budgetPolicy:
      'Load-to-ready: 150% plus 100 ms; image decode: 150% plus 5 ms; other durations: 125% plus 2 ms; bytes: 125% plus 256 KiB; counts: 125% plus 1',
    measured,
    budgets,
    measuredChurn,
    churnBudgets,
  };
  await writeFile(resolve(path), `${JSON.stringify(baseline, null, 2)}\n`);
};

const compareBaseline = async (
  path: string,
  report: BenchmarkReport,
): Promise<void> => {
  const baseline = await readBaseline(path);
  const regressions: NonNullable<
    BenchmarkReport['baselineComparison']
  >['regressions'] = [];
  report.scenarios.forEach((scenario) => {
    const budgets = baseline.budgets?.[scenario.id];
    if (!budgets) {
      regressions.push({
        scenario: scenario.id,
        metric: 'baseline scenario missing',
        actual: 1,
        budget: 0,
      });
      return;
    }
    compareMetricBudgets(flattenScenarioMetrics(scenario), budgets).forEach(
      (regression) =>
        regressions.push({ scenario: scenario.id, ...regression }),
    );
  });
  const currentIds = new Set(report.scenarios.map((scenario) => scenario.id));
  Object.keys(baseline.budgets ?? {}).forEach((scenario) => {
    if (!currentIds.has(scenario)) {
      regressions.push({
        scenario,
        metric: 'scenario missing from run',
        actual: 1,
        budget: 0,
      });
    }
  });
  const churnBudgets = baseline.churnBudgets ?? [];
  const churnCount = Math.max(report.dungeonChurn.length, churnBudgets.length);
  for (let index = 0; index < churnCount; index++) {
    const measurement = report.dungeonChurn[index];
    const budgets = churnBudgets[index];
    const id = `dungeon-churn-${String(index + 1)}`;
    if (!measurement || !budgets) {
      regressions.push({
        scenario: id,
        metric: !measurement
          ? 'iteration missing from run'
          : 'baseline budget missing',
        actual: 1,
        budget: 0,
      });
      continue;
    }
    compareMetricBudgets(flattenChurnMetrics(measurement), budgets).forEach(
      (regression) => regressions.push({ scenario: id, ...regression }),
    );
  }
  report.baselineComparison = { regressions };
};

const stopChild = async (child: ChildProcess | undefined): Promise<void> => {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise<void>((resolvePromise) =>
      child.once('exit', () => resolvePromise()),
    ),
    delay(2000),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
};

const run = async (): Promise<void> => {
  const options = parseOptions(process.argv.slice(2));
  let preview: ChildProcess | undefined;
  let chrome: ChildProcess | undefined;
  let profile: string | undefined;
  let cdp: CdpConnection | undefined;
  let sessionId: string | undefined;
  let targetId: string | undefined;
  try {
    let url = options.url;
    if (!url) {
      const started = await startPreview();
      preview = started.child;
      url = started.url;
    }
    const chromeSession = await startChrome(options.headed);
    chrome = chromeSession.child;
    profile = chromeSession.profile;
    const version = await waitForChrome(chromeSession.debugPort, chrome);
    if (typeof version.webSocketDebuggerUrl !== 'string') {
      throw new Error(
        'Chrome did not provide a browser DevTools WebSocket URL',
      );
    }
    cdp = await CdpConnection.connect(version.webSocketDebuggerUrl);
    const browserVersion = await cdp.send('Browser.getVersion');
    const systemInfo = await cdp.send('SystemInfo.getInfo');
    const gpu = systemInfo.gpu as
      | {
          devices?: unknown;
          auxAttributes?: Record<string, unknown>;
          featureStatus?: Record<string, unknown>;
        }
      | undefined;
    const renderer =
      typeof gpu?.auxAttributes?.glRenderer === 'string'
        ? gpu.auxAttributes.glRenderer
        : 'unavailable';
    const skiaBackend =
      typeof gpu?.auxAttributes?.skiaBackendType === 'string'
        ? gpu.auxAttributes.skiaBackendType
        : 'unavailable';
    const graphics = {
      devices: gpu?.devices ?? [],
      renderer,
      displayType: gpu?.auxAttributes?.displayType ?? null,
      skiaBackend,
      featureStatus: gpu?.featureStatus ?? {},
    };
    const target = await cdp.send('Target.createTarget', {
      url: 'about:blank',
    });
    targetId = target.targetId as string;
    const attached = await cdp.send('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    sessionId = attached.sessionId as string;
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Network.enable', {}, sessionId);
    await cdp.send(
      'Page.addScriptToEvaluateOnNewDocument',
      { source: preloadSource },
      sessionId,
    );

    const scenarios: ScenarioResult[] = [];
    let hasNavigated = false;
    for (const dungeonId of options.dungeons) {
      for (const projection of options.projections) {
        for (const dpr of options.dprs) {
          await cdp.send(
            'Emulation.setDeviceMetricsOverride',
            {
              width: options.width,
              height: options.height,
              screenWidth: options.width,
              screenHeight: options.height,
              deviceScaleFactor: dpr,
              mobile: false,
            },
            sessionId,
          );
          const seed = dungeonId === 'e1m5' ? 42 : 314159;
          const scenarioInput = {
            campaignId: 'iceDragonTreasure',
            dungeonId,
            seed,
            explored: true,
            projection,
          };
          const cold = await runLoadMeasurement(
            cdp,
            sessionId,
            url,
            scenarioInput,
            true,
            hasNavigated,
          );
          hasNavigated = cold.hasNavigated;
          const warm = await runLoadMeasurement(
            cdp,
            sessionId,
            url,
            scenarioInput,
            false,
            hasNavigated,
          );
          hasNavigated = warm.hasNavigated;
          const board = await getBoardSize(cdp, sessionId);
          const idle = await measurePhase(cdp, sessionId, options.idleMs);
          const pan = await measurePhase(
            cdp,
            sessionId,
            options.interactionMs,
            () => dispatchPan(cdp!, sessionId!, board),
          );
          const zoom = await measurePhase(
            cdp,
            sessionId,
            options.interactionMs,
            () => dispatchZoom(cdp!, sessionId!, board),
          );
          const id = `${dungeonId}-${projection}-dpr${String(dpr)}`;
          scenarios.push({
            id,
            dungeonId,
            projection,
            dpr,
            seed,
            boardSize: board,
            coldLoad: cold.measurement,
            warmLoad: warm.measurement,
            idle: idle.frames,
            pan: pan.frames,
            zoom: zoom.frames,
            trace: summarizeTraceEvents([
              ...cold.traceEvents,
              ...warm.traceEvents,
              ...idle.traceEvents,
              ...pan.traceEvents,
              ...zoom.traceEvents,
            ]),
          });
          process.stdout.write(`Measured ${id}\n`);
        }
      }
    }

    await cdp.send(
      'Emulation.setDeviceMetricsOverride',
      {
        width: options.width,
        height: options.height,
        screenWidth: options.width,
        screenHeight: options.height,
        deviceScaleFactor: 1,
        mobile: false,
      },
      sessionId,
    );
    await callHarness<unknown>(cdp, sessionId, 'loadScenario', {
      campaignId: 'iceDragonTreasure',
      dungeonId: 'e1m5',
      seed: 42,
      explored: true,
      projection: 'topDown',
    });
    const dungeonChurn = await collectChurn(cdp, sessionId, options.churn);
    const userAgent = await evaluate<string>(
      cdp,
      sessionId,
      'navigator.userAgent',
    );
    const report: BenchmarkReport = {
      recordedAt: new Date().toISOString(),
      environment: {
        browser: browserVersion.product ?? version.Browser ?? 'Chrome/Chromium',
        browserVersion,
        graphics,
        graphicsSummary: `${graphics.renderer}; ${graphics.skiaBackend}`,
        userAgent,
        os: `${platform()} ${release()} (${process.arch})`,
        cpu: cpus()[0]?.model ?? 'unknown',
        logicalCpuCount: cpus().length,
        totalMemoryBytes: totalmem(),
        headless: !options.headed,
        viewport: { width: options.width, height: options.height },
        gitCommit: getGitCommit(),
        workingTreeDirty: isGitWorkingTreeDirty(),
        urlPath: new URL(url).pathname,
        cache:
          'cold uses Network.clearBrowserCache and ignoreCache; warm reload follows without clearing',
      },
      scenarios,
      dungeonChurn,
    };
    if (options.baseline) await compareBaseline(options.baseline, report);
    if (options.recordBaseline) {
      await recordBaseline(options.recordBaseline, report);
    }
    await writeReport(report, options.out);
    if (report.baselineComparison?.regressions.length) process.exitCode = 1;
  } finally {
    if (cdp && targetId) {
      try {
        await cdp.send('Target.closeTarget', { targetId });
      } catch {
        // Chrome may already have exited after an earlier failure.
      }
    }
    cdp?.close();
    await stopChild(chrome);
    await stopChild(preview);
    if (profile) await rm(profile, { recursive: true, force: true });
  }
};

run().catch((error: unknown) => {
  process.stderr.write(
    `Browser benchmark failed: ${error instanceof Error ? error.stack : String(error)}\n`,
  );
  process.exitCode = 1;
});
