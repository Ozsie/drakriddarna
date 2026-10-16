import type {
  Actor,
  BloodParticle,
  BloodSplatter,
  FlameEffect,
  FlameParticle,
  GameState,
  Position,
  ProjectileAnimation,
} from '../types';
import { getActorFlashIntensity } from '../core/ActorAnimation';

export const BLOOD_SPLATTER_DURATION_MS = 500;
export const PROJECTILE_DURATION_MS = 220;
export const FLAME_EFFECT_DURATION_MS = 600;

export const FLAME_COLORS = [
  '#fff3b0',
  '#ffe066',
  '#ffd166',
  '#ffb703',
  '#fb8500',
  '#f77f00',
  '#d62828',
  '#e63946',
];

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
  };
};

export const createFlameEffect = (
  position: Position,
  options?: {
    timestamp?: number;
    durationMs?: number;
    particleCount?: number;
    colors?: string[];
  },
): FlameEffect => {
  const count = options?.particleCount ?? 22;
  const colors = options?.colors ?? FLAME_COLORS;
  const particles: FlameParticle[] = [];

  for (let i = 0; i < count; i++) {
    const offsetX = (Math.random() - 0.5) * 0.7; // spreading within cell
    const offsetY = (Math.random() - 0.2) * 0.4;
    const speedY = 0.35 + Math.random() * 0.45;
    const driftX = (Math.random() - 0.5) * 0.25;
    const radius = 2.0 + Math.random() * 3.5;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const delay = Math.random() * 0.25;
    particles.push({
      offsetX,
      offsetY,
      speedY,
      driftX,
      radius,
      color,
      delay,
    });
  }

  return {
    id: `flame-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    position: { x: position.x, y: position.y },
    particles,
    timestamp: options?.timestamp ?? Date.now(),
    durationMs: options?.durationMs ?? FLAME_EFFECT_DURATION_MS,
  };
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
    const overallAlpha = Math.sin(progress * Math.PI); // Smooth in & out

    const centerX = (flame.position.x + 0.5) * cellSize;
    const bottomY = (flame.position.y + 0.85) * cellSize;

    ctx.save();

    // Central flame glow
    const glowRadius = cellSize * (0.35 + 0.15 * Math.sin(progress * Math.PI));
    if (ctx.createRadialGradient) {
      const gradient = ctx.createRadialGradient(
        centerX,
        bottomY - cellSize * 0.25,
        cellSize * 0.05,
        centerX,
        bottomY - cellSize * 0.25,
        glowRadius,
      );
      gradient.addColorStop(0, `rgba(255, 230, 100, ${0.75 * overallAlpha})`);
      gradient.addColorStop(0.4, `rgba(255, 120, 0, ${0.5 * overallAlpha})`);
      gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, bottomY - cellSize * 0.25, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rising flame tongue particles
    flame.particles.forEach((p) => {
      if (progress < p.delay) return;
      const particleProgress = (progress - p.delay) / (1 - p.delay);
      if (particleProgress > 1) return;

      const px =
        centerX +
        p.offsetX * cellSize +
        Math.sin(particleProgress * Math.PI * 2 + p.offsetX) *
          p.driftX *
          cellSize;
      const py =
        bottomY +
        p.offsetY * cellSize -
        particleProgress * p.speedY * cellSize * 1.1;

      const pAlpha = Math.max(0, 1 - particleProgress) * overallAlpha * 1.2;
      const radius = Math.max(0.8, p.radius * (1 - particleProgress * 0.55));

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, pAlpha));
      ctx.fillStyle = p.color;
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = Math.max(2, cellSize * 0.08);
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.restore();
  });

  return hasActive;
};
