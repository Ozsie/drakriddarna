# 06 — Agent Guidelines

## Working assumptions

- The game repo (this repository) is the authority for every type the
  protocol touches: `GameState` and `GameAction` in `src/types.ts`, logic
  entry points in `src/game.ts`, the client action surface in
  `src/store/gameStateStore.ts`, rng in `src/core/dice.ts`. Never trust the
  spec's quotes over the source.
- Multiplayer is built **in this repo** (client) plus the new `server/`
  package (01). Unlike the Campaign Editor, the game repo is modified.
- Single-player must remain unchanged: every milestone must leave
  `npm run check`, `npm test`, and `npm run lint` green with no session
  active, and must not regress the benchmark suite.

## Build & test commands

```bash
# game repo (client) — the existing commands; nothing new
npm run check
npm test
npm run lint
npm run dev

# server package
cd server && npm install && npm test      # unit + ws integration tests
cd server && npm run dev                  # local ws server on PORT (default 8080)

# end-to-end (manual, once per relevant milestone)
npm run dev            # in one terminal
cd server && npm run dev  # in another
# open the game twice in two browser profiles; create + join with a code
```

The client dev server reads `VITE_MULTIPLAYER_SERVER_URL` from
`.env` (add a `.env.example` with `VITE_MULTIPLAYER_SERVER_URL=ws://localhost:8080`).
Never commit a `.env`.

## Coding conventions

- Game-repo client code follows the repo rules (AGENTS.md): strict TS, no
  `any`, no `console`, seeded rng only for gameplay randomness (multiplayer
  transport uses no gameplay randomness at all), i18n for all user-facing
  strings in both `en` and `sv`, tests colocated as `*.test.ts`.
- The `server/` package mirrors those rules (strict TS, ESLint `no-console`
  — use a tiny logger module identical in spirit to `src/core/logger.ts`).
- Protocol types live once, in `src/multiplayer/protocol.ts`. The server's
  `protocol.ts` may not import from `src/` (01); a compatibility test
  compares the two schemas structurally.
- No new runtime dependencies in the game client. The WebSocket API is
  native; reconnection is hand-rolled (deliberately — 04).
- Commit messages imperative, one-line subject, small buildable commits.

## Milestones

Work strictly in order; each milestone's definition of done (DoD) must be
satisfied before the next begins. No speculative phase 2 work: no static
blob split, no chat, no mid-game join, no host migration, no anti-cheat.

### M1 — Protocol module + server skeleton

- `src/multiplayer/protocol.ts` (envelope, message catalog, intents — 02) with round-trip tests.
- `server/` package: Node + `ws`, room registry (codes, TTL, caps),
  create/join/leave, relay fan-out, protocol version checking, health
  endpoint.
- **DoD**: server integration test drives two real ws clients through
  create → join → relay → leave → idle close; `JOIN_REJECTED` paths
  covered (not found, full, version mismatch, started); the
  protocol-compatibility test passes; `npm run check`/`npm test` in the
  game repo green with the new module in place.

### M2 — Client transport + session store

- `multiplayerSessionStore` (role, code, players, connection status),
  `connection.ts` (connect, single reconnect attempt, room-lost surface),
  lobby routes with i18n (en/sv).
- **DoD**: from `npm run dev` against a local server: create room, see the
  code, second browser joins, player lists update on both, leave works;
  join-error reasons display correctly in both languages.

### M3 — Host session

- `hostSession.ts`: receive intents, validate (ownership, busy, legality),
  apply through the existing store pipeline, broadcast `SNAPSHOT`
  (`SerializedState` per 03), reject with `INTENT_REJECTED`.
- Host player's own actions enter the same validation path.
- **DoD**: headless two-session integration test (05 testing strategy)
  plays a full e1m0 game with the benchmark bot driving guest intents to
  completion (WON/LOST); rejected-intent and busy-window cases covered;
  guest final state equals host final state byte-for-byte (modulo the
  three excluded visual keys).

### M4 — Guest session + input gating

- `guestSession.ts`: snapshot → store application, intent sending from the
  store interceptor, `inputGating.ts` canAct table, "your turn" affordance,
  "monsters acting" banner (04).
- **DoD**: two browser sessions play e1m0 co-op with input correctly
  enabled only for the owning player; a dropped guest's heroes fall back
  to host control; gating unit tests green.

### M5 — Lobby claiming + readiness + start flow

- Hero claiming UI, `CLAIM_HEROES` arbitration, ready toggles,
  `GAME_STARTED` transition, lobby → game handoff.
- **DoD**: full manual flow — create, share code, claim heroes, ready up,
  start, play with claimed heroes only; claims survive
  `PLAYER_JOINED`/`PLAYER_LEFT` broadcasts; en/sv strings complete.

### M6 — Lifecycle hardening

- `GAME_ENDED`, room-lost and host-left screens, idle-timeout handling,
  persistence gating on guests, end-of-game board viewing.
- **DoD**: win and loss each produce `GAME_ENDED` and the correct screen;
  host disconnect mid-game shows room-lost on guests with the final board
  frozen; guest reload does not clobber the host's session; single-player
  save/load verified unaffected (`npm test`, plus one manual
  save/refresh/resume in solo mode).

## Definition of done (every milestone)

- Game repo: `npm run check`, `npm test`, `npm run lint` green; server
  package: `npm test` green.
- No `TODO`/`FIXME` left in the milestone's scope.
- New behaviors covered by tests (protocol round-trips, gating table,
  integration test for host/guest pairs).
- One-paragraph summary of what changed committed with the milestone.

## Explicit non-goals to respect during implementation

- Do not add game-logic branches for multiplayer — no `if (multiplayer)`
  inside `src/game.ts`, `src/hero/`, `src/monsters/`, or any logic module.
- Do not modify the save format or `saveVersion`.
- Do not sync visual-only state (`bloodSplatters`, `damageIndicators`,
  `shakeEffects`) — 03.
- Do not build diffs, patches, or partial-state messages.
- Do not implement mid-game join, host migration, chat, spectators,
  matchmaking, accounts, or anti-cheat/visibility filtering (README).
- Do not add client runtime dependencies (no Socket.IO, no reconnect
  libraries).
- Do not touch the editor spec or its assumptions — the editor remains a
  separate application with no knowledge of multiplayer.
