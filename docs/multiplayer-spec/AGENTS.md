# Drakriddarna Network Multiplayer

Cooperative network play for the Drakriddarna game: a host-authoritative
WebSocket relay (`server/`) plus a multiplayer session mode in the game
client. Guests send **intents**; the host runs the unmodified game logic and
broadcasts full **snapshots**. No diffs, no server-side game logic, no
host migration.

## Specification

The full spec lives in [`docs/multiplayer-spec/`](./). It is authoritative
for architecture, protocol, sync model, session lifecycle, client
integration, and milestones.

Read it in this order before writing any code:

1. `docs/multiplayer-spec/README.md` — scope, decisions already made
2. `01-architecture.md` through `05-client-integration.md`
3. `06-agent-guidelines.md` — milestones, conventions, definition of done

Where the spec and the game source disagree, **the game source wins**
(`src/types.ts` for `GameState`/`GameAction`, `src/game.ts` for logic entry
points, `src/store/gameStateStore.ts` for the client action surface).

## Repository layout

- Game client changes live in `src/multiplayer/` plus a thin seam in
  `src/store/gameStateStore.ts` (see 05).
- The relay server lives in `server/` — a separate package with its own
  `package.json`, deployed separately from GitHub Pages (see 01).

## Non-negotiable rules

- Single-player behavior is unchanged when no session is active:
  `npm run check`, `npm test`, `npm run lint` stay green with zero behavior
  change.
- The host is the single writer of `GameState`. Guests never mutate
  authoritative state; they send intents.
- No game-logic branches for multiplayer (`if (multiplayer)` in logic
  modules is forbidden). No new client runtime dependencies.
- Full state per snapshot, with exactly three visual keys excluded
  (`bloodSplatters`, `damageIndicators`, `shakeEffects`). No diffs, ever.
- Clients must match the host's build exactly to join (`ClientVersion`
  gate, 02).
- All user-facing strings in both `en` and `sv` via sveltekit-i18n.
- v1 is trusted-friends co-op: no visibility filtering, no anti-cheat,
  no mid-game join, no host migration. Do not build these unasked.

## Working discipline

Work through the milestones M1–M6 in `06-agent-guidelines.md` strictly in
order; each milestone's definition of done must be satisfied before the
next begins. Do not pre-build phase 2 features (static blob split, chat,
spectators, re-host flow).
