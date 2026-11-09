import type {
  Actor,
  BloodParticle,
  BloodSplatter,
  FlameEffect,
  GameState,
  Position,
  ProjectileAnimation,
  ShakeEffect,
} from '../types';
import { getActorFlashIntensity } from '../core';
import { getReadyImage } from '../core/ImageCache';

export const BLOOD_SPLATTER_DURATION_MS = 500;
export const PROJECTILE_DURATION_MS = 220;
export const FLAME_EFFECT_DURATION_MS = 600;
export const SHAKE_DURATION_MS = 450;
const VFX_FRAME_COUNT = 15;

// Default reach of an epicenter shake, in cells from the epicenter.
export const SHAKE_DEFAULT_RADIUS_CELLS = 8;

export const BLOOD_COLORS = [
  '#7a0000',
  '#900c3f',
  '#a30000',
  '#b30000',
  '#c70039',
  '#6b0000',
  '#8b0000',
];

export const createBloodSplatter = (
  position: Position,
  options?: {
    damage?: number;
    timestamp?: number;
    durationMs?: number;
    particleCount?: number;
    colors?: string[];
  },
): BloodSplatter => {
  const count =
    options?.particleCount ??
    Math.min(22, Math.max(10, 8 + (options?.damage ?? 1) * 3));
  const colors = options?.colors ?? BLOOD_COLORS;
  const particles: BloodParticle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.05 + Math.random() * 0.12;
    const radius = 1.2 + Math.random() * 2.6;
    const distance = 0.18 + Math.random() * 0.38;
    const color = colors[Math.floor(Math.random() * colors.length)];
    particles.push({
      angle,
      speed,
      radius,
      color,
      distance,
    });
  }

  return {
    id: `blood-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    position: { x: position.x, y: position.y },
    particles,
    timestamp: options?.timestamp ?? Date.now(),
    durationMs: options?.durationMs ?? BLOOD_SPLATTER_DURATION_MS,
  };
};

export const createProjectile = (
  from: Position,
  to: Position,
  options?: {
    timestamp?: number;
    durationMs?: number;
    color?: string;
    sprite?: ProjectileAnimation['sprite'];
  },
): ProjectileAnimation => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  const calculatedDuration = Math.min(
    320,
    Math.max(140, Math.round(dist * 45)),
  );

  return {
    id: `proj-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    from: { x: from.x, y: from.y },
    to: { x: to.x, y: to.y },
    timestamp: options?.timestamp ?? Date.now(),
    durationMs: options?.durationMs ?? calculatedDuration,
    color: options?.color ?? '#ffdd44',
    sprite: options?.sprite,
  };
};

export const createFireAoEEffect = (
  position: Position,
  options?: { timestamp?: number; durationMs?: number; scale?: number },
): FlameEffect => ({
  id: `flame-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  position: { x: position.x, y: position.y },
  sprite: 'fireAoE',
  scale: options?.scale ?? 3,
  timestamp: options?.timestamp ?? Date.now(),
  durationMs: options?.durationMs ?? FLAME_EFFECT_DURATION_MS,
});

const getVfxFrame = (
  sprite: 'arrow' | 'fireSpell' | 'fireAoE',
  progress: number,
): HTMLImageElement | null => {
  const frame = Math.min(
    VFX_FRAME_COUNT - 1,
    Math.floor(progress * VFX_FRAME_COUNT),
  );
  const fileNumber = String(frame * 2 + 1).padStart(4, '0');
  const directory = {
    arrow: 'Arrow',
    fireSpell: 'FireSpell',
    fireAoE: 'FireAoE',
  }[sprite];
  return getReadyImage(`vfx/${directory}/${fileNumber}.png`);
};

export const createShake = (options?: {
  epicenter?: Position;
  amplitude?: number;
  radius?: number;
  timestamp?: number;
  durationMs?: number;
}): ShakeEffect => ({
  id: `shake-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  ...(options?.epicenter ? { epicenter: { ...options.epicenter } } : {}),
  amplitude: options?.amplitude ?? 6,
  radius: options?.radius ?? SHAKE_DEFAULT_RADIUS_CELLS,
  timestamp: options?.timestamp ?? Date.now(),
  durationMs: options?.durationMs ?? SHAKE_DURATION_MS,
});

// The shake effects still running at `now`.
export const activeShakes = (
  shakes: ShakeEffect[] | undefined,
  now: number,
): ShakeEffect[] =>
  (shakes ?? []).filter((shake) => {
    const start = shake.timestamp ?? 0;
    const duration = shake.durationMs ?? SHAKE_DURATION_MS;
    return now >= start && now < start + duration;
  });

// The screen jitter of the active shakes at `now`, in pixels, as one
// summed offset: each shake contributes a random jitter that decays
// quadratically over its life, scaled by how far the view centre sits
// from the shake's epicenter (a screen-wide shake ignores the view).
// Visual-only randomness, so Math.random is fine here.
export const shakeJitter = (
  shakes: ShakeEffect[],
  viewCenter: Position,
  now: number,
): { x: number; y: number } => {
  let x = 0;
  let y = 0;
  shakes.forEach((shake) => {
    const start = shake.timestamp ?? 0;
    const duration = shake.durationMs ?? SHAKE_DURATION_MS;
    const elapsed = Math.min(Math.max(now - start, 0), duration);
    const progress = duration > 0 ? elapsed / duration : 1;
    const decay = (1 - progress) * (1 - progress);
    let attenuation = 1;
    if (shake.epicenter) {
      const distance = Math.hypot(
        shake.epicenter.x - viewCenter.x,
        shake.epicenter.y - viewCenter.y,
      );
      attenuation = Math.max(
        0,
        1 - distance / (shake.radius ?? SHAKE_DEFAULT_RADIUS_CELLS),
      );
    }
    const strength = (shake.amplitude ?? 6) * decay * attenuation;
    if (strength <= 0) return;
    x += (Math.random() * 2 - 1) * strength;
    y += (Math.random() * 2 - 1) * strength;
  });
  return { x, y };
};

export const renderActorFlash = (
  ctx: CanvasRenderingContext2D,
  actor: Actor,
  x: number,
  y: number,
  cellSize: number,
  currentTime: number = Date.now(),
): void => {
  const intensity = getActorFlashIntensity(actor, currentTime);
  if (intensity <= 0) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x * cellSize, y * cellSize, 32, 32);
  ctx.clip();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = `rgba(255, 255, 255, ${intensity * 0.85})`;
  ctx.fillRect(x * cellSize, y * cellSize, 32, 32);
  ctx.restore();
};

export const renderBloodSplatters = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  currentTime: number = Date.now(),
): boolean => {
  if (!state.bloodSplatters || state.bloodSplatters.length === 0) {
    return false;
  }

  let hasActive = false;

  state.bloodSplatters.forEach((splatter) => {
    const timestamp = splatter.timestamp ?? currentTime;
    const elapsed = currentTime - timestamp;
    const duration = splatter.durationMs ?? BLOOD_SPLATTER_DURATION_MS;

    if (elapsed < 0) {
      hasActive = true;
      return;
    }

    if (elapsed > duration) {
      return;
    }

    hasActive = true;
    const progress = Math.min(Math.max(elapsed / duration, 0), 1);
    const easeOut = 1 - Math.pow(1 - progress, 2);
    const alpha = Math.max(0, 1 - progress);

    const centerX = (splatter.position.x + 0.5) * cellSize;
    const centerY = (splatter.position.y + 0.5) * cellSize;

    ctx.save();
    splatter.particles.forEach((p) => {
      const travel = p.distance * cellSize * easeOut;
      const px = centerX + Math.cos(p.angle) * travel;
      const py =
        centerY +
        Math.sin(p.angle) * travel +
        progress * progress * cellSize * 0.12;
      const r = Math.max(0.5, p.radius * (1 - progress * 0.4));

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  });

  return hasActive;
};

export const renderProjectiles = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  currentTime: number = Date.now(),
): boolean => {
  if (!state.projectiles || state.projectiles.length === 0) {
    return false;
  }

  let hasActive = false;

  state.projectiles.forEach((proj) => {
    const timestamp = proj.timestamp ?? currentTime;
    const elapsed = currentTime - timestamp;
    const duration = proj.durationMs ?? PROJECTILE_DURATION_MS;

    if (elapsed < 0) {
      hasActive = true;
      return;
    }

    if (elapsed > duration) {
      return;
    }

    hasActive = true;
    const progress = Math.min(Math.max(elapsed / duration, 0), 1);

    const startX = (proj.from.x + 0.5) * cellSize;
    const startY = (proj.from.y + 0.5) * cellSize;
    const targetX = (proj.to.x + 0.5) * cellSize;
    const targetY = (proj.to.y + 0.5) * cellSize;

    const currX = startX + (targetX - startX) * progress;
    const currY = startY + (targetY - startY) * progress;
    const angle = Math.atan2(targetY - startY, targetX - startX);

    ctx.save();

    const spriteImage = proj.sprite ? getVfxFrame(proj.sprite, progress) : null;
    if (spriteImage) {
      const spriteWidth = cellSize * (proj.sprite === 'arrow' ? 1.15 : 0.75);
      const aspectRatio =
        spriteImage.naturalWidth / Math.max(1, spriteImage.naturalHeight);
      const spriteHeight = spriteWidth / aspectRatio;
      ctx.translate(currX, currY);
      ctx.rotate(angle);
      ctx.drawImage(
        spriteImage,
        -spriteWidth / 2,
        -spriteHeight / 2,
        spriteWidth,
        spriteHeight,
      );
      ctx.restore();
      return;
    }

    const totalDistTravelled = Math.hypot(currX - startX, currY - startY);
    const trailLength = Math.min(cellSize * 0.4, totalDistTravelled);
    if (trailLength > 1) {
      const tailX = currX - Math.cos(angle) * trailLength;
      const tailY = currY - Math.sin(angle) * trailLength;

      ctx.strokeStyle = proj.color ?? '#ffdd44';
      ctx.lineWidth = Math.max(2, cellSize * 0.05);
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(currX, currY);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = proj.color ?? '#fff59d';
    ctx.shadowColor = proj.color ?? '#ffbb00';
    ctx.shadowBlur = Math.max(4, cellSize * 0.12);
    ctx.beginPath();
    ctx.arc(currX, currY, Math.max(2.5, cellSize * 0.07), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(currX, currY, Math.max(1.2, cellSize * 0.035), 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });

  return hasActive;
};

export const renderFlameEffects = (
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  state: GameState,
  currentTime: number = Date.now(),
): boolean => {
  if (!state.flameEffects || state.flameEffects.length === 0) {
    return false;
  }

  let hasActive = false;

  state.flameEffects.forEach((flame) => {
    const timestamp = flame.timestamp ?? currentTime;
    const elapsed = currentTime - timestamp;
    const duration = flame.durationMs ?? FLAME_EFFECT_DURATION_MS;

    if (elapsed < 0) {
      hasActive = true;
      return;
    }

    if (elapsed > duration) {
      return;
    }

    hasActive = true;
    const progress = Math.min(Math.max(elapsed / duration, 0), 1);

    const centerX = (flame.position.x + 0.5) * cellSize;
    const spriteImage = getVfxFrame(flame.sprite, progress);
    if (spriteImage) {
      const size = cellSize * (flame.scale ?? 3);
      ctx.save();
      ctx.drawImage(
        spriteImage,
        centerX - size / 2,
        (flame.position.y + 0.5) * cellSize - size / 2,
        size,
        size,
      );
      ctx.restore();
    }
  });

  return hasActive;
};
