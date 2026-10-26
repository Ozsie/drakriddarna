// Signature keys intentionally interpolate numbers and booleans into
// plain dirty-check strings; the strict template-literal rule is aimed at
// user-facing text instead.
/* eslint-disable @typescript-eslint/restrict-template-expressions */
import type {
  Actor,
  Door,
  GameState,
  InteractableCell,
  ItemLocation,
  LightSource,
  Monster,
  Secret,
} from '../types';

// Signature helpers for the Dungeon board's layered render loop: each
// layer only redraws when its signature changes, so the signature must
// capture every piece of state the layer draws from.

export const getStaticSignature = (
  st: GameState,
  dbg: boolean,
  size: number,
) => {
  const d = st?.dungeon;
  if (!d) return '';
  return `${d.name}|${(d.discoveredRooms ?? []).join(',')}|${(
    d.layout?.doors ?? []
  )
    .map((dr: Door) => `${dr.x},${dr.y},${dr.open},${dr.locked},${dr.hidden}`)
    .join(';')}|${(d.layout?.secrets ?? [])
    .map((s: Secret) => `${s.position.x},${s.position.y},${s.found}`)
    .join(';')}|${(d.layout?.interactables ?? [])
    .map(
      (i: InteractableCell) =>
        `${i.position.x},${i.position.y},${i.secret},${i.interacted}`,
    )
    .join(';')}|${(d.layout?.items ?? [])
    .map(
      (it: ItemLocation) =>
        `${it.position.x},${it.position.y},${
          it.item?.id ?? it.item?.name ?? 'random'
        }`,
    )
    .join(';')}|${d.layout?.pits?.length ?? 0}|${
    d.layout?.pits?.length ?? 0
  }|${d.portal?.x},${d.portal?.y}|${size}|${dbg}`;
};

export const getDynamicSignature = (
  st: GameState,
  dbg: boolean,
  size: number,
) => {
  const heroes = (st?.heroes ?? [])
    .map(
      (h: Actor) =>
        `${h.name},${h.position.x},${h.position.y},${h.health},${h.actions},${h.movement},${h.incapacitated}`,
    )
    .join(';');
  const monsters = (st?.dungeon?.layout?.monsters ?? [])
    .map(
      (m: Monster) => `${m.name},${m.position.x},${m.position.y},${m.health}`,
    )
    .join(';');
  const curActor = `${st?.currentActor?.name},${st?.currentActor?.position?.x},${st?.currentActor?.position?.y}`;
  // Light shadows depend on fog of war and on the light sources themselves,
  // including the light sources of items in actor inventories.
  const rooms = (st?.dungeon?.discoveredRooms ?? []).join(',');
  const lights = (st?.dungeon?.layout?.lights ?? [])
    .map(
      (l: LightSource) =>
        `${l.position.x},${l.position.y},${l.alignment},${l.enabled}`,
    )
    .join(';');
  const itemLights = [
    ...(st?.heroes ?? []),
    ...(st?.dungeon?.layout?.monsters ?? []),
  ]
    .map((a: Actor) =>
      (a.inventory ?? [])
        .map((item) => (item?.light ? `${item.id ?? item.name}` : ''))
        .filter(Boolean)
        .join(','),
    )
    .join('|');
  // Event-driven lights: hero flags, disabled items, round-scoped event
  // lights and the hexagram portal.
  const eventLightFlags = (st?.heroes ?? [])
    .map(
      (h: Actor) =>
        `${h.blinded ? 1 : 0}${h.weakened ? 1 : 0}${
          h.weapon?.elemental ? 1 : 0
        }${(h.inventory ?? []).some((item) => item?.disabled) ? 1 : 0}`,
    )
    .join(';');
  const eventLightsSig = `${(st?.eventLights ?? [])
    .map((l: LightSource) => `${l.id ?? ''}@${l.position.x},${l.position.y}`)
    .join(',')}|${st?.dungeon?.portal?.x ?? ''},${
    st?.dungeon?.portal?.y ?? ''
  }`;
  // Interactable lights (braziers etc.) toggle on interaction.
  const interactableLights = (st?.dungeon?.layout?.interactables ?? [])
    .map((i) =>
      i.light
        ? `${i.id ?? ''}@${i.position.x},${i.position.y}:${i.light.enabled}`
        : '',
    )
    .join(';');
  return `${heroes}|${monsters}|${curActor}|${rooms}|${lights}|${itemLights}|${eventLightFlags}|${eventLightsSig}|${interactableLights}|${size}|${dbg}`;
};

export const getOverlaySignature = (
  st: GameState,
  dbg: boolean,
  size: number,
) => {
  const curActor = `${st.currentActor?.name},${st.currentActor?.position?.x},${st.currentActor?.position?.y}`;
  const dmgCount = st.damageIndicators?.length ?? 0;
  const bloodCount = st.bloodSplatters?.length ?? 0;
  const projCount = st.projectiles?.length ?? 0;
  const flameCount = st.flameEffects?.length ?? 0;
  return `${curActor}|${dmgCount}|${bloodCount}|${projCount}|${flameCount}|${size}|${dbg}`;
};
