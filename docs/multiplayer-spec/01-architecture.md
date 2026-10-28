# 01 — Architecture

## Components

Three components, one protocol:

```
┌────────────┐  intents   ┌──────────┐  intents   ┌────────────┐
│            │ ─────────▶ │          │ ─────────▶ │            │
│  Guest(s)  │            │  Server  │            │    Host    │
│  (browser) │ ◀───────── │  (relay) │ ◀───────── │  (browser) │
└────────────┘ snapshots  └──────────┘ snapshots └────────────┘
     renders                 rooms,                    runs game logic,
     sends intents           code registry,           validates intents,
                             fan-out                  broadcasts snapshots,
                                                      owns rng + save
```

- **Host** — a regular game client that created a room. Runs the unmodified
  game logic, is the single writer of `GameState`, and broadcasts snapshots.
- **Guests** — regular game clients joined to a room. Their stores become
  read-only sinks; local input is converted to intents instead of mutations.
- **Server** — a Node process that owns WebSocket connections, maps room
  codes to connection sets, and relays frames. It understands message
  _envelopes_ (for routing) but never message _payload semantics_ beyond
  join/create validation.

The server is deliberately boring. If it ever needs to inspect a
`GameState`, the architecture has drifted.

## Tech stack

| Concern          | Choice                           | Notes                                                                                                 |
| ---------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Server runtime   | Node.js (LTS), TypeScript strict | Same language and style rules as the game repo                                                        |
| WS library       | `ws`                             | Permessage-deflate enabled (`perMessageDeflate: true`) — measured snapshot sizes assume it (03)       |
| Server framework | None                             | No Express/Fastify; `ws` + `node:http` for a health endpoint is all v1 needs                          |
| Client transport | Native browser `WebSocket`       | No Socket.IO, no reconnecting wrapper library — reconnection is an explicit, small state machine (04) |
| Serialization    | `JSON.stringify` / `JSON.parse`  | `GameState` is already fully JSON-serializable                                                        |
| Room storage     | In-memory `Map`                  | Rooms die with the process. No Redis, no database                                                     |
| Testing          | Vitest                           | Server unit + integration tests, colocated; protocol tests live in the game repo (06)                 |

## Repository placement

The server lives **in this repository** under `server/`, as a separate
package — not inside the SvelteKit app:

```
server/
  package.json          # own deps: ws + types; own scripts
  tsconfig.json         # strict, mirroring src/ conventions
  src/
    index.ts            # entry: http server + ws upgrade, port from env
    rooms.ts             # RoomRegistry: create/join/leave, code generation
    protocol.ts          # envelope parse/validate, message types (shared shape)
    connection.ts        # per-socket event handling, relay routing
    server.test.ts       # integration: two ws clients, full room lifecycle
```

Rationale: the protocol and the state schema must version together with the
client (they both depend on `GameState` and `GameAction` from
`src/types.ts`). One repository, two packages, deployed separately — the
same lockstep argument as the editor's catalog export, in reverse.

The server package must not import from `src/` at runtime — the game bundle
is not published. The server's `protocol.ts` mirrors the envelope schema by
hand and is validated against the client's protocol module by a
type-compatibility test in the game repo (06, M1).

## Authority model

**Single writer.** Every mutation of `GameState` happens on the host, in
process order:

1. A guest (or the host player) produces an intent.
2. The intent reaches the host (local call or relay).
3. The host validates it: version, ownership (is the sender assigned the
   `currentActor` hero?), and legality (would the action succeed against the
   current state?).
4. The host applies it through the **existing logic functions** — no
   parallel multiplayer code path. `act`, `attack`, `search`, `interact`,
   `openDoorAtHero`, `pickLock`, `useHeroItem`, `endAction`, `next` are the
   entry points; the store's `dispatchAction`/`dispatch` remain the glue.
5. The host serializes the state and broadcasts a snapshot to everyone
   (including itself for UI uniformity, or applies locally — see 05).

Guests are pure renderers between snapshots. Their local logic modules are
still loaded (derived stores, rendering, hover/hit-testing all read state),
but nothing writes to the authoritative store. Concretely: the multiplayer
session layer sits between the UI and `gameStateStore` — when a session is
active, UI actions that would call store mutators are converted to intents
(05).

**Determinism.** The host owns the seeded rng (`src/core/dice.ts`). Since
guests never execute gameplay logic, determinism is not used for lockstep —
it simply guarantees the host is the only client whose rng sequence matters.
No seeds are sent over the wire in v1.

**Monster turns, animations, and the turn pipeline.** `next()` and
`endAction()` are async and animate monster actions via callbacks. On the
host, they run with animations enabled exactly as in single-player; the
host broadcasts a snapshot after the turn pipeline settles (see 04 for the
exact sequencing rules).

## Deployment

- The game client keeps deploying as today: static build → GitHub Pages.
  Multiplayer changes nothing about `adapter-static` or the deploy pipeline.
- The server deploys to any small always-on host (Fly, Railway, a VPS, …)
  with TLS terminated in front (or by the platform). Because the client is
  served over HTTPS, the server **must** be reachable via `wss://`.
- Server configuration is env-only: `PORT`, `MAX_ROOMS`, `ROOM_IDLE_TTL_MS`.
  No config files.
- The client learns the server URL from an env-prefixed build variable
  (`VITE_MULTIPLAYER_SERVER_URL`), with a sane default baked in at deploy
  time. Nothing about the server URL is hardcoded in logic.
- Room codes: 4 characters from an unambiguous set (`23456789ABCDEFGHJKMNPQRSTUVWXYZ`),
  generated by the server, case-insensitive on join. On collision the server
  regenerates. Codes are stored uppercase.

## Non-functional requirements

- A snapshot broadcast to 5 connected clients completes in under 50 ms
  server-side (relay only; no payload transformation).
- Rooms idle longer than `ROOM_IDLE_TTL_MS` (default 4 hours) are closed by
  the server; the host is notified with `ROOM_CLOSED`.
- The server stays stateless enough that a restart is survivable: clients
  attempt one reconnect (04); after that, the room is gone and the player
  sees the room-lost screen. No persistence is promised.
