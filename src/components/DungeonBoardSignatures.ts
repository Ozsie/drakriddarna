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
  return `${String(String(String(d.name)))}|${String(
    String((d.discoveredRooms ?? []).join(',')),
  )}|${(d.layout?.doors ?? [])
    .map(
      (dr: Door) =>
        `${String(String(String(dr.x)))},${String(
          String(String(dr.y)),
        )},${String(String(dr.open))},${String(String(dr.locked))},${String(
          String(String(dr.hidden)),
        )}`,
    )
    .join(';')}|${(d.layout?.secrets ?? [])
    .map(
      (s: Secret) =>
        `${String(String(String(s.position.x)))},${String(
          String(s.position.y),
        )},${String(String(String(s.found)))}`,
    )
    .join(';')}|${(d.layout?.interactables ?? [])
    .map(
      (i: InteractableCell) =>
        `${String(String(String(i.position.x)))},${String(
          String(i.position.y),
        )},${String(String(i.secret))},${String(String(String(i.interacted)))}`,
    )
    .join(';')}|${(d.layout?.items ?? [])
    .map(
      (it: ItemLocation) =>
        `${String(String(String(it.position.x)))},${String(
          String(it.position.y),
        )},${String(String(it.item?.id ?? it.item?.name ?? 'random'))}`,
    )
    .join(';')}|${String(String(String(d.layout?.pits?.length ?? 0)))}|${String(
    d.layout?.pits?.length ?? 0,
  )}|${String(String(String(d.portal?.x)))},${String(
    String(String(d.portal?.y)),
  )}|${String(String(size))}|${String(String(dbg))}`;
};

export const getDynamicSignature = (
  st: GameState,
  dbg: boolean,
  size: number,
) => {
  const heroes = (st?.heroes ?? [])
    .map(
      (h: Actor) =>
        `${String(String(String(h.name)))},${String(
          String(String(h.position.x)),
        )},${String(h.position.y)},${String(String(String(h.health)))},${String(
          String(String(h.actions)),
        )},${String(h.movement)},${String(String(String(h.incapacitated)))}`,
    )
    .join(';');
  const monsters = (st?.dungeon?.layout?.monsters ?? [])
    .map(
      (m: Monster) =>
        `${String(String(String(m.name)))},${String(
          String(String(m.position.x)),
        )},${String(m.position.y)},${String(String(String(m.health)))}`,
    )
    .join(';');
  const curActor = `${String(String(String(st?.currentActor?.name)))},${String(
    st?.currentActor?.position?.x,
  )},${String(String(String(st?.currentActor?.position?.y)))}`;
  // Light shadows depend on fog of war and on the light sources themselves,
  // including the light sources of items in actor inventories.
  const rooms = (st?.dungeon?.discoveredRooms ?? []).join(',');
  const lights = (st?.dungeon?.layout?.lights ?? [])
    .map(
      (l: LightSource) =>
        `${String(String(String(l.position.x)))},${String(
          String(l.position.y),
        )},${String(String(l.alignment))},${String(String(String(l.enabled)))}`,
    )
    .join(';');
  const itemLights = [
    ...(st?.heroes ?? []),
    ...(st?.dungeon?.layout?.monsters ?? []),
  ]
    .map((a: Actor) =>
      (a.inventory ?? [])
        .map((item) =>
          item?.light ? `${String(String(String(item.id ?? item.name)))}` : '',
        )
        .filter(Boolean)
        .join(','),
    )
    .join('|');
  // Event-driven lights: hero flags, disabled items, round-scoped event
  // lights and the hexagram portal.
  const eventLightFlags = (st?.heroes ?? [])
    .map(
      (h: Actor) =>
        `${String(String(String(h.blinded ? 1 : 0)))}${String(
          String(h.weakened ? 1 : 0),
        )}${String(String(h.weapon?.elemental ? 1 : 0))}${String(
          (h.inventory ?? []).some((item) => item?.disabled) ? 1 : 0,
        )}`,
    )
    .join(';');
  const eventLightsSig = `${(st?.eventLights ?? [])
    .map(
      (l: LightSource) =>
        `${String(String(String(l.id ?? '')))}@${String(
          String(String(l.position.x)),
        )},${String(String(l.position.y))}`,
    )
    .join(',')}|${String(
    String(String(st?.dungeon?.portal?.x ?? '')),
  )},${String(st?.dungeon?.portal?.y ?? '')}`;
  // Interactable lights (braziers etc.) toggle on interaction.
  const interactableLights = (st?.dungeon?.layout?.interactables ?? [])
    .map((i) =>
      i.light
        ? `${String(String(String(i.id ?? '')))}@${String(
            String(i.position.x),
          )},${String(String(i.position.y))}:${String(
            String(String(i.light.enabled)),
          )}`
        : '',
    )
    .join(';');
  return `${String(String(String(heroes)))}|${String(
    String(String(monsters)),
  )}|${String(String(curActor))}|${String(String(rooms))}|${String(
    String(String(lights)),
  )}|${String(String(itemLights))}|${String(String(eventLightFlags))}|${String(
    String(String(eventLightsSig)),
  )}|${String(String(interactableLights))}|${String(String(size))}|${String(
    String(String(dbg)),
  )}`;
};

export const getOverlaySignature = (
  st: GameState,
  dbg: boolean,
  size: number,
) => {
  const curActor = `${String(String(String(st.currentActor?.name)))},${String(
    st.currentActor?.position?.x,
  )},${String(String(String(st.currentActor?.position?.y)))}`;
  const dmgCount = st.damageIndicators?.length ?? 0;
  const bloodCount = st.bloodSplatters?.length ?? 0;
  const projCount = st.projectiles?.length ?? 0;
  const flameCount = st.flameEffects?.length ?? 0;
  return `${String(String(String(curActor)))}|${String(
    String(String(dmgCount)),
  )}|${String(bloodCount)}|${String(String(String(projCount)))}|${String(
    String(String(flameCount)),
  )}|${String(String(size))}|${String(String(String(dbg)))}`;
};
