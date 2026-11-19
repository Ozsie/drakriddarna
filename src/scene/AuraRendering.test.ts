import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function makeCanvas() {
  const putImageData = vi.fn();
  const getContext = vi.fn<() => { putImageData: typeof putImageData } | null>(
    () => ({
      putImageData,
    }),
  );
  const canvases: {
    width: number;
    height: number;
    getContext: typeof getContext;
  }[] = [];
  const createElement = vi.fn(() => {
    const canvas = { width: 0, height: 0, getContext };
    canvases.push(canvas);
    return canvas;
  });
  const drawImage =
    vi.fn<
      (
        image: CanvasImageSource,
        sx: number,
        sy: number,
        sw: number,
        sh: number,
        dx: number,
        dy: number,
        dw: number,
        dh: number,
      ) => void
    >();
  const context = { drawImage } as unknown as CanvasRenderingContext2D;
  vi.stubGlobal('document', { createElement });
  vi.stubGlobal(
    'ImageData',
    class {
      constructor(
        public data: Uint8ClampedArray,
        public width: number,
        public height: number,
      ) {}
    },
  );
  return {
    context,
    createElement,
    putImageData,
    getContext,
    canvases,
    drawImage,
  };
}

describe('drawAura', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders 128-pixel frames with saturated highlights in both projections', async () => {
    const { createAura } = await import('./aura');
    for (const mode of ['topdown', 'isometric'] as const) {
      for (const seed of ['hexagram', 'ring_of_precision']) {
        const aura = createAura(seed, { mode });
        expect(aura.size).toBe(128);
        const frame = aura.render(0);
        expect(frame.length).toBe(128 * 128 * 4);
        const highlights: number[] = [];
        for (let i = 0; i < frame.length; i += 4) {
          if (frame[i + 3] >= 180) {
            highlights.push(Math.min(frame[i], frame[i + 1], frame[i + 2]));
          }
        }
        expect(highlights.length).toBeGreaterThan(0);
        expect(
          highlights.reduce((sum, channel) => sum + channel, 0) /
            highlights.length,
        ).toBeLessThan(80);
      }
    }
  });

  it('gives the portal and generated item auras distinct deterministic silhouettes', async () => {
    const { AURA_SIZE, createAura } = await import('./aura');
    const seeds = [
      'hexagram',
      'boots_of_speed',
      'giants_glove',
      'ring_of_precision',
      'crown_of_wisdom',
    ];
    const silhouettes = seeds.map((seed) => {
      const aura = createAura(seed);
      const frame = aura.render(0);
      expect(frame.some((value, index) => index % 4 === 3 && value > 0)).toBe(
        true,
      );
      expect(frame).toEqual(createAura(seed).render(0));
      expect(frame).toEqual(aura.render(aura.loopSeconds));
      const reused = new Uint8ClampedArray(frame.length);
      expect(aura.render(1.25, reused)).toBe(reused);
      expect(reused).toEqual(aura.render(1.25));
      return Array.from(
        { length: AURA_SIZE * AURA_SIZE },
        (_, pixel) => frame[pixel * 4 + 3] > 48,
      );
    });

    for (let first = 0; first < silhouettes.length; first++) {
      for (let second = first + 1; second < silhouettes.length; second++) {
        let differingPixels = 0;
        for (let pixel = 0; pixel < silhouettes[first].length; pixel++) {
          if (silhouettes[first][pixel] !== silhouettes[second][pixel]) {
            differingPixels++;
          }
        }
        expect(differingPixels / silhouettes[first].length).toBeGreaterThan(
          0.1,
        );
      }
    }

    const topdown = createAura('hexagram').render(0);
    const isometric = createAura('hexagram', { mode: 'isometric' }).render(0);
    expect(isometric).not.toEqual(topdown);
  });

  it('imports headlessly, lazily bakes a sheet and reuses it across frames', async () => {
    const aura = await import('./aura');
    const getCachedAura = vi.spyOn(aura, 'getCachedAura');
    const auraSpriteSheet = vi.spyOn(aura, 'auraSpriteSheet');
    const { drawAura } = await import('./AuraRendering');
    const canvas = makeCanvas();
    expect(canvas.createElement).not.toHaveBeenCalled();
    drawAura(canvas.context, 'one', 'topdown', 10, 20, 40, 30, 1.01);
    drawAura(canvas.context, 'one', 'topdown', 50, 60, 80, 90, 1.124);
    drawAura(canvas.context, 'one', 'topdown', 0, 0, 64, 64, 1.125);
    expect(getCachedAura).toHaveBeenCalledWith('one', { mode: 'topdown' });
    expect(auraSpriteSheet).toHaveBeenCalledTimes(1);
    expect(canvas.createElement).toHaveBeenCalledTimes(1);
    expect(canvas.canvases[0]).toMatchObject({ width: 128 * 48, height: 128 });
    expect(canvas.putImageData).toHaveBeenCalledTimes(48);
    expect(canvas.drawImage).toHaveBeenNthCalledWith(
      1,
      canvas.canvases[0],
      8 * 128,
      0,
      128,
      128,
      -10,
      5,
      40,
      30,
    );
    expect(canvas.drawImage).toHaveBeenNthCalledWith(
      2,
      canvas.canvases[0],
      8 * 128,
      0,
      128,
      128,
      10,
      15,
      80,
      90,
    );
    expect(canvas.drawImage).toHaveBeenNthCalledWith(
      3,
      canvas.canvases[0],
      9 * 128,
      0,
      128,
      128,
      -32,
      -32,
      64,
      64,
    );
  });

  it('isolates seeds and projections and draws the full isometric image around its footprint', async () => {
    const aura = await import('./aura');
    const { drawAura } = await import('./AuraRendering');
    const canvas = makeCanvas();
    drawAura(canvas.context, 'one', 'topdown', 100, 200, 80, 40, 0);
    drawAura(canvas.context, 'two', 'topdown', 100, 200, 80, 40, 0);
    drawAura(canvas.context, 'one', 'isometric', 100, 200, 80, 40, 0);
    drawAura(canvas.context, 'one', 'topdown', 100, 200, 80, 40, 0);
    expect(canvas.createElement).toHaveBeenCalledTimes(3);
    expect(canvas.putImageData).toHaveBeenCalledTimes(3 * 48);
    const one = aura.getCachedAura('one', { mode: 'topdown' });
    const two = aura.getCachedAura('two', { mode: 'topdown' });
    const iso = aura.getCachedAura('one', { mode: 'isometric' });
    expect(one.frames[0]).not.toEqual(two.frames[0]);
    expect(one.frames[0]).not.toEqual(iso.frames[0]);
    expect(canvas.drawImage).toHaveBeenNthCalledWith(
      1,
      canvas.canvases[0],
      0,
      0,
      128,
      128,
      60,
      180,
      80,
      40,
    );
    expect(canvas.drawImage).toHaveBeenNthCalledWith(
      3,
      canvas.canvases[2],
      0,
      0,
      128,
      128,
      60,
      160,
      80,
      80,
    );
    expect(canvas.drawImage).toHaveBeenNthCalledWith(
      4,
      canvas.canvases[0],
      0,
      0,
      128,
      128,
      60,
      180,
      80,
      40,
    );
  });

  it('wraps positive and negative time and respects baked metadata', async () => {
    const aura = await import('./aura');
    const baked = {
      size: 12,
      frameCount: 4,
      loopSeconds: 2,
      frames: [],
      frameAt: vi.fn(),
    };
    vi.spyOn(aura, 'getCachedAura').mockReturnValue(baked);
    const sheet = {} as HTMLCanvasElement;
    vi.spyOn(aura, 'auraSpriteSheet').mockReturnValue(sheet);
    const { drawAura } = await import('./AuraRendering');
    const canvas = makeCanvas();
    for (const time of [0, 0.499, 0.5, 1.999, 2, -0.5]) {
      drawAura(canvas.context, 'one', 'topdown', 0, 0, 20, 20, time);
    }
    expect(canvas.drawImage.mock.calls.map((call) => call[1])).toEqual([
      0, 0, 12, 36, 0, 36,
    ]);
    expect(canvas.drawImage.mock.calls[0]).toEqual([
      sheet,
      0,
      0,
      12,
      12,
      -10,
      -10,
      20,
      20,
    ]);
  });

  it('selects the same frame as the board scheduler at epoch timestamps', async () => {
    const aura = await import('./aura');
    vi.spyOn(aura, 'getCachedAura').mockReturnValue({
      size: 64,
      frameCount: 48,
      loopSeconds: 6,
      frames: [],
      frameAt: vi.fn(),
    });
    vi.spyOn(aura, 'auraSpriteSheet').mockReturnValue({} as HTMLCanvasElement);
    const { drawAura } = await import('./AuraRendering');
    const canvas = makeCanvas();
    for (let frame = 0; frame < 48; frame++) {
      const timeMs = 1700000000000 + frame * 125;
      drawAura(
        canvas.context,
        'hexagram',
        'topdown',
        0,
        0,
        64,
        64,
        timeMs / 1000,
      );
      expect(canvas.drawImage.mock.calls[frame][1]).toBe(
        (Math.floor(timeMs / 125) % 48) * 64,
      );
    }
  });

  it('rebuilds the sheet if the baked cache is cleared', async () => {
    const aura = await import('./aura');
    const { drawAura } = await import('./AuraRendering');
    const canvas = makeCanvas();
    drawAura(canvas.context, 'one', 'topdown', 0, 0, 64, 64, 0);
    aura.clearAuraCache();
    drawAura(canvas.context, 'one', 'topdown', 0, 0, 64, 64, 0);
    expect(canvas.createElement).toHaveBeenCalledTimes(2);
  });

  it('propagates a missing sheet context and retries on the next draw', async () => {
    const { drawAura } = await import('./AuraRendering');
    const canvas = makeCanvas();
    canvas.getContext.mockReturnValueOnce(null);
    expect(() =>
      drawAura(canvas.context, 'one', 'topdown', 0, 0, 64, 64, 0),
    ).toThrow('2D canvas context unavailable');
    expect(canvas.drawImage).not.toHaveBeenCalled();
    drawAura(canvas.context, 'one', 'topdown', 0, 0, 64, 64, 0);
    expect(canvas.drawImage).toHaveBeenCalledTimes(1);
  });
});
