# Network Multiplayer — Specification & Agent Guidelines

This folder contains the complete specification for **Drakriddarna network
multiplayer**: cooperative play over the network, where each player controls
their own heroes in a shared dungeon, synced through a small WebSocket server
with room keys.

Multiplayer is a different kind of feature from the Campaign Editor
([docs/editor-spec/](../editor-spec/)): the editor is a separate application
that never touches the game, while multiplayer **modifies the game repo**
(client integration) and adds one new component (a relay server). This spec
covers both.

## Scope decisions (already made — do not relitigate)

| Decision | Choice |
|---|---|
| Play model | Cooperative network multiplayer; each player controls one or more heroes |
| Topology | Host-authoritative. The server is a dumb relay + room registry; game logic runs only on the host client |
| Transport | WebSocket (`ws` library, Node). No HTTP REST, no WebRTC, no polling |
| Sync payload | Full mutable `GameState` per resolved action. No diffs, no partial patches |
| Client changes | Gated behind a multiplayer session mode; single-player behavior must remain byte-for-byte unchanged |
| Server location | New `server/` folder in this repository, deployed separately from GitHub Pages |
| RNG ownership | Host owns the seeded rng; guests never roll |
| Hidden information | Trusted-friends model in v1. No server-side visibility filtering; a modified client can see hidden monsters/doors. Acceptable for private rooms |
| Save policy | Host persists to `localStorage` exactly as today; guests do not persist |
| Host migration | None. If the host disconnects, the room ends |
| v1 non-goals | Spectators, chat, mid-game join of an in-progress dungeon, host migration, anti-cheat, diff/partial sync, matchmaking, persistent accounts |

### Rationale for the two biggest calls

**Host-authoritative, not server-authoritative.** All game logic is
engine-agnostic TypeScript in `src/core/` through `src/game.ts`. Running it a
second time on the server would mean extracting it into a shared package and
duplicating the deployment. Instead, the client that creates the room hosts
the logic: guests send *intents*, the host validates and applies them through
the existing functions (`act`, `attack`, `search`, `endAction`, `next`, …),
and broadcasts the resulting state. The server never sees game rules.

**Full state, not diffs.** Measured on real headless playthroughs (see
[03-sync-model.md](./03-sync-model.md)): a complete `GameState` is 30–370 KB
raw, ~20–40 KB with `permessage-deflate` (negotiated automatically by WS
implementations), sent once per resolved action in a turn-based game. Diff
machinery would add sequence numbers, gap recovery, and ordering guarantees
to save bandwidth nobody is waiting for. Full-state snapshots are also
self-healing: any client that missed messages renders correctly from any
snapshot, which makes reconnect trivial.

## Reading order

| Doc | Contents |
|---|---|
| [01-architecture.md](./01-architecture.md) | Components, tech stack, authority model, deployment |
| [02-protocol.md](./02-protocol.md) | Wire protocol: envelope, full message catalog, intent mapping onto `GameAction`, version gate |
| [03-sync-model.md](./03-sync-model.md) | What syncs, what does not; measured sizes; snapshots; reconnect data |
| [04-session-lifecycle.md](./04-session-lifecycle.md) | Room lifecycle, roles, hero claiming, turn flow, monster phase, persistence, disconnects |
| [05-client-integration.md](./05-client-integration.md) | Exact game-repo changes: multiplayer module, store wiring, input gating, lobby UI, i18n |
| [06-agent-guidelines.md](./06-agent-guidelines.md) | Build/test commands, coding conventions, phased milestones, definition of done |

## How to brief an agent

Give the agent this folder as its specification and tell it:

- The game repository is the authority for every type the protocol touches.
  The authoritative definitions are `src/types.ts` (including `GameAction`),
  `src/game.ts` (logic entry points), `src/store/gameStateStore.ts` (client
  action surface), and `src/core/dice.ts` (rng). Where the spec and the game
  source disagree, the game source wins.
- Read the docs in numbered order before writing code.
- Work milestone by milestone (06); each milestone has an explicit definition
  of done including tests.
- Single-player must keep working identically: `npm run check`, `npm test`,
  and `npm run lint` must stay green with no behavior change when no
  multiplayer session is active.
- The multiplayer server is new code and may use `ws` and Node APIs
  freely; game-repo client code keeps the repo's existing constraints
  (strict TS, no `any`, no `console`, seeded rng for gameplay randomness,
  i18n for every user-facing string).

## Glossary

- **Room** — a multiplayer session on the server, identified by a
  short human-shareable room code.
- **Host** — the client that created the room; the only client that runs
  game logic and owns the seeded rng.
- **Guest** — any other client in the room; sends intents, renders state,
  never mutates authoritative state locally.
- **Intent** — a request to perform a hero action, sent guest → host.
  Maps onto the existing `GameAction` union (see 02).
- **Snapshot** — a full serialized `GameState` broadcast by the host.
- **Ownership** — the assignment of heroes to players; the owner of
  `state.currentActor` is the only player who may act.
- **Static blob** — the (phase 2) optimization of sending never-changing
  content once per join instead of in every snapshot (see 03).
