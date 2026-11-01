// A recording stand-in for CanvasRenderingContext2D, used by parity and
// sentinel tests. Every method call and every style property write is
// appended to a string log that tests snapshot or assert on. Nothing is
// actually rendered, and `measureText` returns a deterministic width based
// on the text length, so a recorded log is stable across runs.

export interface RecordingContext {
  /** Ordered log of method calls and property writes. */
  readonly log: readonly string[];
  /** The recording stub, typed as the context the renderers expect. */
  readonly ctx: CanvasRenderingContext2D;
}

// Width per character returned by measureText, matching the multiplier the
// renderer tests have always stubbed with.
const MEASURE_WIDTH_PER_CHAR = 8;

// Identifies the gradient objects handed out by createLinearGradient and
// createRadialGradient so they log as `gradient` when assigned to a style.
const gradientTag = Symbol('gradient');

const styleProperties = [
  'fillStyle',
  'strokeStyle',
  'lineWidth',
  'font',
  'textAlign',
  'textBaseline',
  'globalAlpha',
  'shadowColor',
  'shadowBlur',
  'shadowOffsetX',
  'shadowOffsetY',
  'lineCap',
  'lineJoin',
  'miterLimit',
  'globalCompositeOperation',
  'imageSmoothingEnabled',
  'filter',
  'direction',
] as const;

const recordingMethods = [
  'save',
  'restore',
  'translate',
  'rotate',
  'scale',
  'setTransform',
  'transform',
  'beginPath',
  'closePath',
  'moveTo',
  'lineTo',
  'quadraticCurveTo',
  'bezierCurveTo',
  'arc',
  'arcTo',
  'ellipse',
  'rect',
  'roundRect',
  'fill',
  'stroke',
  'clip',
  'fillRect',
  'strokeRect',
  'clearRect',
  'fillText',
  'strokeText',
  'setLineDash',
  'drawImage',
] as const;

const isGradient = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  (value as Record<symbol, unknown>)[gradientTag] === true;

const formatArg = (value: unknown): string => {
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(formatArg).join(', ')}]`;
  if (typeof value === 'object' && value !== null) {
    if (isGradient(value)) return 'gradient';
    // Opaque handles such as the images passed to drawImage.
    return 'image';
  }
  return String(value);
};

export const createRecordingContext = (): RecordingContext => {
  const log: string[] = [];
  const values = new Map<string, unknown>();

  const recordCall =
    (name: string) =>
    (...args: unknown[]): void => {
      log.push(`${name}(${args.map(formatArg).join(', ')})`);
    };

  const base: Record<string | symbol, unknown> = {
    canvas: { width: 300, height: 150 },
  };

  for (const name of recordingMethods) {
    base[name] = recordCall(name);
  }

  base.measureText = (text: string): TextMetrics => {
    log.push(`measureText(${formatArg(text)})`);
    // Only the width is read by the layout code; the rest of TextMetrics is
    // never consumed.
    return { width: text.length * MEASURE_WIDTH_PER_CHAR } as TextMetrics;
  };

  const createGradient =
    (name: string) =>
    (...args: unknown[]): unknown => {
      log.push(`${name}(${args.map(formatArg).join(', ')})`);
      return {
        addColorStop: (offset: number, color: string): void => {
          log.push(`addColorStop(${formatArg(offset)}, ${formatArg(color)})`);
        },
        [gradientTag]: true,
      };
    };
  base.createLinearGradient = createGradient('createLinearGradient');
  base.createRadialGradient = createGradient('createRadialGradient');

  for (const prop of styleProperties) {
    Object.defineProperty(base, prop, {
      get: (): unknown => values.get(prop),
      set: (value: unknown): void => {
        values.set(prop, value);
        log.push(`${prop}=${formatArg(value)}`);
      },
      configurable: true,
    });
  }

  return {
    log,
    ctx: base as unknown as CanvasRenderingContext2D,
  };
};
