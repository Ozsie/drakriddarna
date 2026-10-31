# 05 — Client Integration

The exact changes to the game repo. Multiplayer must be a **session mode**,
not a fork of the logic: with no session active, the game behaves exactly as
today — same bundle paths, same persistence, no network code running.

## New module: `src/multiplayer/`

```
src/multiplayer/
  protocol.ts            # Envelope + message + Intent types (source of truth, 02)
  multiplayerSessionStore.ts  # session state: role, room code, players, connection status
  connection.ts          # WebSocket wrapper: connect, single-reconnect, backpressure guard
  hostSession.ts         # host role: validate+apply intents, broadcast snapshots (03/04)
  guestSession.ts        # guest role: send intents, receive snapshots into store
  inputGating.ts         # canAct(hero) / isMyTurn derived stores (pure, unit-tested)
  inputGating.test.ts
  protocol.test.ts
```

All UI/UX strings go through sveltekit-i18n in
`src/lib/translations/{en,sv}/multiplayer.json` (auto-discovered by the
existing glob). No hardcoded text — including join errors and banners.

## The seam: `gameStateStore` action routing

The existing store is the choke point for every mutation (UI → store →
logic). One integration seam, not a rewrite of call sites:

- `gameStateStore.ts` gains an injected **action interceptor** (set by
  `multiplayerSessionStore` when a session starts). When a guest session is
  active, the gameplay mutators (`moveHero`, `searchAction`,
  `pickLockAction`, `interactAction`, `useHeroItem`, `selectTargetHero`,
  `endHeroAction`, `nextTurn`, `handleCanvasClick`/`dispatchAction` with
  gameplay actions) convert their arguments to the matching `Intent` (02)
  and send it instead of dispatching locally.
- The host session installs the same interceptor on _receive_: applying a
  remote intent goes through the same store functions after validation, so
  there is exactly one mutation path for local and remote actions.
- UI-only actions (`toggleHeroInventory`, `removeDamageIndicatorAction`,
  locale/music/debug setters, menu navigation) never intercept — they stay
  local on every client.
- **Persistence gating.** `saveGame`/reload-guard logic is inert on guests
  during a session (04). The host saves as today.

This keeps `DungeonBoardController`, the canvas UI, and all rendering
untouched: they already read state from stores and write via store mutators.

## Input gating

A derived store computed from `(session role, players, state.currentActor)`:

- `canAct(heroId)` — true only for the player who owns `state.currentActor`
  (or the host for unclaimed heroes).
- The board's existing hit-test/hover machinery is unchanged; gating
  happens at the dispatch boundary (interceptor drops/queues input when
  `canAct` is false) plus a visual affordance: the current hero's card and
  the board cursor indicate "your turn" vs "waiting".
- Guests during the monster phase see the "monsters acting" banner (04) —
  driven by `isTurnInProgress`, which the host mirrors into its snapshots
  via the settled-state rule (guests derive it: between snapshots after
  `END_ACTION`, show the banner until the next snapshot arrives).

Radial menu options, keyboard movement, and click targets all flow through
the same store mutators, so no per-input-site gating code is needed.

## Lobby UI

New Svelte routes/components, thin like the existing ones:

- **Multiplayer entry** (from the main menu): "Create room" (campaign + Game
  Master pickers reused from existing menu components) and "Join room"
  (code entry + display name).
- **Lobby screen**: room code (large, copyable), player list with names and
  claimed heroes, hero claiming UI (reuses hero cards), ready toggles,
  host-side start button (enabled when all ready, 04).
- **In-game overlays**: connection status indicator, player list (who owns
  which hero), room-lost / host-left screen, `JOIN_REJECTED` reasons.
- These are DOM/Svelte UI, consistent with the existing menu screens (not
  canvas-drawn; the board itself stays canvas).

Menu plumbing: the main menu links to the multiplayer entry only when
`VITE_MULTIPLAYER_SERVER_URL` is present (05 deployment, 01).

## What must not change

- **Logic modules** (`src/core/`, `src/game.ts`, `src/hero/`,
  `src/monsters/`, `src/dungeon/`, `src/events/`, `src/items/`,
  `src/campaigns/`, `src/gameMasters/`) — no multiplayer-specific branches.
  The host is just the single-player game with a broadcast attached.
- **Rendering** (`src/ui/`, `DungeonBoardController`, light/fog/terrain
  systems) — untouched except the "your turn" affordance noted above.
- **Single-player behavior** — with no session active, the interceptor is a
  no-op passthrough; `npm test`, benchmarks, and save migration are
  unaffected.
- **Save format** — `SerializedState` exclusions (03) are wire-only. What
  the host persists to `localStorage` is the full state, unchanged
  `saveVersion` migration.

## Testing strategy

- `protocol.test.ts` — round-trip every message type; reject malformed
  envelopes; version gate unit cases.
- `inputGating.test.ts` — the canAct truth table (host/guest, claimed/
  unclaimed, monster phase, ended).
- **Two-client headless integration test** (the multiplayer equivalent of
  the benchmark bot): an in-memory "server" shim plus a host session and a
  guest session, driven by the existing benchmark bot's intents against a
  real dungeon (e1m0). Asserts: guests never mutate authoritative state;
  snapshots arrive per action; a rejected intent does not change state; a
  full game reaches WON/LOST with identical final state on both sides.
- Reconnect/disconnect paths are exercised at the connection-layer level
  (fake sockets), not with real network in unit tests.
