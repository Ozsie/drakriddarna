/**
 * aura.ts — procedural, rotating, glowing aura (64x64), top-down or isometric.
 *
 *   const aura = createAura("Fire Mage", { mode: "isometric" });
 *   const rgba = aura.render(timeInSeconds);          // Uint8ClampedArray, 64*64*4, non-premultiplied
 *
 * Or drop it straight onto a canvas:
 *
 *   const stop = animateAura(canvas, "Fire Mage", { mode: "topdown" });
 *
 * - The input string deterministically seeds everything: hue, palette spread,
 *   symmetry order, number of rings, ray sharpness, spin direction, etc.
 * - The pattern has N-fold rotational symmetry with mirror folding
 *   (kaleidoscope style), so it is circularly symmetric about the centre.
 * - Every layer rotates by a whole number of symmetry sectors per loop, and
 *   the pulse uses integer frequencies, so the animation loops seamlessly
 *   every `loopSeconds`.
 * - Glow = additive light + 2-pass bloom + exponential tone-mapping, so hot
 *   areas bleed to white and fade to transparent.
 * - Isometric mode projects the same disc onto the ground plane using the
 *   classic 2:1 pixel-art ellipse (64 wide x 32 tall, centred).
 */

export const AURA_SIZE = 64;

export type AuraMode = "topdown" | "isometric";

export interface AuraOptions {
  /** 'topdown' (circle) or 'isometric' (2:1 ellipse). Default: 'topdown'. */
  mode?: AuraMode;
  /** Seconds for one seamless animation loop. Default: 6. */
  loopSeconds?: number;
}

export interface Aura {
  readonly size: number;
  readonly mode: AuraMode;
  readonly loopSeconds: number;
  /**
   * Render the frame at `time` (seconds). Returns non-premultiplied RGBA,
   * length 64*64*4. Pass `out` to reuse a buffer and avoid allocation.
   */
  render(time: number, out?: Uint8ClampedArray): Uint8ClampedArray;
}

/* ------------------------------------------------------------------ */
/* Seeding                                                             */
/* ------------------------------------------------------------------ */

function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface RingParams {
  radius: number;
  width: number;
  amp: number; // angular wobble amplitude (radial)
  freq: number; // integer wobble frequency per sector
  gain: number;
  rot: number; // integer: sectors rotated per loop
}

interface AuraParams {
  n: number; // rotational symmetry order
  hue: number;
  hueSpread: number;
  sat: number;
  rings: RingParams[];
  twist: number;
  dir: 1 | -1;
  rayFreq: number;
  rayPower: number;
  rayGain: number;
  rayRot: number;
  petalRadius: number;
  petalGain: number;
  petalRot: number;
  coreSize: number;
  coreGain: number;
  pulseFreq: number;
  pulseAmt: number;
}

function deriveParams(input: string): AuraParams {
  const rnd = mulberry32(hashString(input));
  const range = (a: number, b: number) => a + (b - a) * rnd();
  const int = (a: number, b: number) => Math.floor(range(a, b + 1));
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];

  const ringCount = int(2, 4);
  const rings: RingParams[] = [];
  for (let i = 0; i < ringCount; i++) {
    rings.push({
      radius: 0.22 + (0.6 * (i + 0.2 + 0.6 * rnd())) / ringCount,
      width: range(0.018, 0.04),
      amp: range(0.02, 0.07),
      freq: int(1, 3),
      gain: range(0.5, 1.0),
      rot: pick([-2, -1, 1, 2]),
    });
  }

  return {
    n: int(3, 10),
    hue: range(0, 360),
    hueSpread: (rnd() < 0.5 ? -1 : 1) * range(30, 110),
    sat: range(0.7, 1.0),
    rings,
    twist: range(-1.2, 1.2),
    dir: rnd() < 0.5 ? 1 : -1,
    rayFreq: int(1, 2),
    rayPower: range(4, 12),
    rayGain: range(0.5, 1.1),
    rayRot: pick([1, 1, 2]),
    petalRadius: range(0.4, 0.7),
    petalGain: range(0.4, 0.9),
    petalRot: pick([-2, -1, 1]),
    coreSize: range(0.1, 0.2),
    coreGain: range(1.0, 1.8),
    pulseFreq: int(1, 3),
    pulseAmt: range(0.12, 0.3),
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const TAU = Math.PI * 2;
const PAL_SIZE = 64;

const mod = (a: number, b: number) => ((a % b) + b) % b;

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Fold an angle into one symmetry sector, mirrored: 0 at sector edge, 1 at its centre. */
function fold(angle: number, sector: number): number {
  const a = mod(angle, sector) / sector;
  return a < 0.5 ? a * 2 : (1 - a) * 2;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = mod(h, 360) / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    t = mod(t, 1);
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}

/** Separable 5-tap binomial blur, zero outside the image. */
function blur(src: Float32Array, dst: Float32Array, tmp: Float32Array, n: number): void {
  const k = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];
  for (let c = 0; c < 3; c++) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let s = 0;
        for (let t = -2; t <= 2; t++) {
          const xx = x + t;
          if (xx >= 0 && xx < n) s += src[(y * n + xx) * 3 + c] * k[t + 2];
        }
        tmp[(y * n + x) * 3 + c] = s;
      }
    }
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let s = 0;
        for (let t = -2; t <= 2; t++) {
          const yy = y + t;
          if (yy >= 0 && yy < n) s += tmp[(yy * n + x) * 3 + c] * k[t + 2];
        }
        dst[(y * n + x) * 3 + c] = s;
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

export function createAura(input: string, options: AuraOptions = {}): Aura {
  const mode: AuraMode = options.mode ?? "topdown";
  const loopSeconds = options.loopSeconds && options.loopSeconds > 0 ? options.loopSeconds : 6;
  const N = AURA_SIZE;
  const p = deriveParams(input);
  const sector = TAU / p.n;

  // Palette LUT (colour as a function of normalised radius).
  const pal = new Float32Array(PAL_SIZE * 3);
  for (let i = 0; i < PAL_SIZE; i++) {
    const [r, g, b] = hslToRgb(p.hue + (p.hueSpread * i) / (PAL_SIZE - 1), p.sat, 0.55);
    pal[i * 3] = r;
    pal[i * 3 + 1] = g;
    pal[i * 3 + 2] = b;
  }

  // Per-pixel polar coordinates on the ground plane (precomputed once).
  // Top-down: unit circle fills 64x64. Isometric: 2:1 ellipse, 64 wide x 32 tall.
  const R = new Float32Array(N * N);
  const TH = new Float32Array(N * N);
  const halfW = N / 2;
  const halfH = mode === "isometric" ? N / 4 : N / 2;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const px = (x + 0.5 - N / 2) / halfW;
      const py = (y + 0.5 - N / 2) / halfH;
      R[y * N + x] = Math.hypot(px, py);
      TH[y * N + x] = Math.atan2(py, px);
    }
  }

  const light = new Float32Array(N * N * 3);
  const bloomA = new Float32Array(N * N * 3);
  const bloomB = new Float32Array(N * N * 3);
  const tmp = new Float32Array(N * N * 3);

  function render(time: number, out?: Uint8ClampedArray): Uint8ClampedArray {
    const buf = out ?? new Uint8ClampedArray(N * N * 4);
    const phase = mod(time / loopSeconds, 1);
    const pulse = 1 + p.pulseAmt * Math.sin(TAU * p.pulseFreq * phase);
    const spin = (rotSectors: number) => p.dir * rotSectors * sector * phase;

    light.fill(0);

    for (let i = 0; i < N * N; i++) {
      const r = R[i];
      if (r >= 1) continue;
      const th = TH[i] + p.twist * r; // spiral twist, applied before folding

      let I = 0;

      // Core glow
      I += p.coreGain * pulse * Math.exp(-(r * r) / (p.coreSize * p.coreSize));

      // Rays
      {
        const u = fold(th + spin(p.rayRot), sector);
        const c = 0.5 + 0.5 * Math.cos(Math.PI * u * p.rayFreq);
        const env = smoothstep(0.06, 0.3, r) * Math.pow(1 - r, 0.9);
        I += p.rayGain * pulse * Math.pow(c, p.rayPower) * env;
      }

      // Wobbling rings
      for (const ring of p.rings) {
        const u = fold(th + spin(ring.rot), sector);
        const rr = ring.radius + ring.amp * Math.cos(Math.PI * u * ring.freq);
        const d = (r - rr) / ring.width;
        I += ring.gain * (Math.exp(-d * d) + 0.25 * Math.exp(-0.35 * Math.abs(d)));
      }

      // Petals (lotus-like outline with faint fill)
      {
        const u = fold(th + spin(p.petalRot), sector);
        const rp = p.petalRadius * (0.35 + 0.65 * (0.5 + 0.5 * Math.cos(Math.PI * u)));
        const d = (r - rp) / 0.03;
        I += p.petalGain * Math.exp(-d * d);
        if (r < rp) I += 0.12 * (1 - r / rp);
      }

      I *= 1 - smoothstep(0.82, 1.0, r); // fade to nothing at the rim

      const pi = Math.min(PAL_SIZE - 1, (r * (PAL_SIZE - 1)) | 0) * 3;
      light[i * 3] = pal[pi] * I;
      light[i * 3 + 1] = pal[pi + 1] * I;
      light[i * 3 + 2] = pal[pi + 2] * I;
    }

    // Bloom: two blur passes, added on top of the sharp light.
    blur(light, bloomA, tmp, N);
    blur(bloomA, bloomB, tmp, N);

    for (let i = 0; i < N * N; i++) {
      const r = 1 - Math.exp(-1.2 * (light[i * 3] + 0.5 * bloomA[i * 3] + 0.9 * bloomB[i * 3]));
      const g = 1 - Math.exp(-1.2 * (light[i * 3 + 1] + 0.5 * bloomA[i * 3 + 1] + 0.9 * bloomB[i * 3 + 1]));
      const b = 1 - Math.exp(-1.2 * (light[i * 3 + 2] + 0.5 * bloomA[i * 3 + 2] + 0.9 * bloomB[i * 3 + 2]));
      const a = Math.max(r, g, b);
      const o = i * 4;
      if (a < 1 / 512) {
        buf[o] = buf[o + 1] = buf[o + 2] = buf[o + 3] = 0;
      } else {
        buf[o] = (r / a) * 255;
        buf[o + 1] = (g / a) * 255;
        buf[o + 2] = (b / a) * 255;
        buf[o + 3] = a * 255;
      }
    }
    return buf;
  }

  return { size: N, mode, loopSeconds, render };
}

/* ------------------------------------------------------------------ */
/* Browser convenience                                                 */
/* ------------------------------------------------------------------ */

/**
 * Animates the aura on a canvas (resized to 64x64). Returns a stop function.
 * Scale it up with CSS: `canvas { image-rendering: pixelated; width: 256px; }`
 */
export function animateAura(
  canvas: HTMLCanvasElement,
  input: string,
  options: AuraOptions = {}
): () => void {
  const aura = createAura(input, options);
  canvas.width = aura.size;
  canvas.height = aura.size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  const image = ctx.createImageData(aura.size, aura.size);
  let raf = 0;
  const start = performance.now();

  const frame = (now: number) => {
    aura.render((now - start) / 1000, image.data);
    ctx.putImageData(image, 0, 0);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}