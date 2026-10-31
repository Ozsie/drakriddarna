# 02 — Protocol

One protocol, two directions, framed as JSON text over a single WebSocket
per client. Every frame is an **envelope**; the server routes by `type` and
otherwise treats payloads as opaque (except join/create, which the server
validates).

## Envelope

```ts
interface Envelope {
  /** Protocol version; currently 1. Mismatched versions reject at join. */
  v: 1;
  type: string;
  /** Server-assigned, per-room, per-connection. Present on every client→server frame. */
  playerId: string;
  /** Monotonic per-sender sequence number; echoed in replies for client-side correlation. */
  seq: number;
  payload: unknown; // typed per message below
}
```

Unknown `type` values are ignored (log + drop). Unknown `v` on join rejects
the join. Envelope shape errors (non-JSON, missing fields, wrong types) drop
the connection: a client that cannot frame correctly is broken.

The client protocol module lives in the game repo at
`src/multiplayer/protocol.ts` and is the single source of truth for
TypeScript message types. `server/src/protocol.ts` mirrors the envelope
schema by hand; a type-compatibility test keeps them in sync (06, M1).

## Version gate

Join and create carry the client's build identity:

```ts
interface ClientVersion {
  /** From buildInfo.json, stamped by the deploy pipeline (date + commit hash). */
  commit: string;
  /** CURRENT_SAVE_VERSION from src/types.ts. */
  saveVersion: number;
  /** Protocol major version, matches Envelope.v. */
  protocolVersion: 1;
}
```

The host compares every joiner's `ClientVersion` against its own and
accepts only exact `commit` matches. Guests with a different build see
`JOIN_REJECTED` with reason `VERSION_MISMATCH`. Rationale: snapshots are raw
serialized state; only identical builds are guaranteed to agree on the
state schema and content (campaigns compile into the bundle). `saveVersion`
equality is implied by commit equality but is checked anyway as a
defense-in-depth assertion.

## Message catalog

### Lobby: client → server

| Type          | Payload                                                                              | Notes                                                              |
| ------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `CREATE_ROOM` | `{ version: ClientVersion, campaignId: string, gameMasterId: string, name: string }` | Sender becomes host. Server allocates code, replies `ROOM_CREATED` |
| `JOIN_ROOM`   | `{ version: ClientVersion, code: string, name: string }`                             | Case-insensitive code                                              |
| `LEAVE_ROOM`  | `{}`                                                                                 | Idempotent                                                         |

### Lobby: server → client

| Type                            | Payload                                                                               | Notes                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `ROOM_CREATED`                  | `{ code: string, playerId: string }`                                                  |                                                           |
| `ROOM_JOINED`                   | `{ code: string, playerId: string, players: PlayerInfo[] }`                           | Sent to the joiner; joiner also gets a snapshot (below)   |
| `JOIN_REJECTED`                 | `{ reason: 'ROOM_NOT_FOUND' \| 'ROOM_FULL' \| 'VERSION_MISMATCH' \| 'GAME_STARTED' }` | `GAME_STARTED`: v1 has no mid-game join (README non-goal) |
| `PLAYER_JOINED` / `PLAYER_LEFT` | `{ players: PlayerInfo[] }`                                                           | Broadcast; `players` is the full list (no deltas)         |
| `ROOM_CLOSED`                   | `{ reason: 'IDLE_TIMEOUT' \| 'SERVER_SHUTDOWN' }`                                     |                                                           |

```ts
interface PlayerInfo {
  playerId: string;
  isHost: boolean;
  name: string; // client-chosen display name, sent on join/create
  claimedHeroIds: string[]; // hero ids this player owns (04)
}
```

`PlayerInfo.name` is free text from the client; treat it as untrusted
display input (length cap 24, trimmed). v1 has no accounts.

### Gameplay: guest → server (relayed to host unchanged)

| Type           | Payload                 | Notes                                   |
| -------------- | ----------------------- | --------------------------------------- |
| `INTENT`       | `{ intent: Intent }`    | The only gameplay message a guest sends |
| `CLAIM_HEROES` | `{ heroIds: string[] }` | Lobby-time hero claiming (04)           |
| `READY`        | `{ ready: boolean }`    | Lobby readiness (04)                    |

The server relays these to the host **verbatim** with the sender's
`playerId`; it does not read `intent`.

### Gameplay: host → server (fan-out to all clients)

| Type              | Payload                                               | Notes                                                            |
| ----------------- | ----------------------------------------------------- | ---------------------------------------------------------------- |
| `SNAPSHOT`        | `{ state: SerializedState, turn: number }`            | Full state after a resolved action; see 03 for `SerializedState` |
| `INTENT_REJECTED` | `{ reason: IntentRejection, targetPlayerId: string }` | Server routes to `targetPlayerId` only                           |
| `GAME_STARTED`    | `{}`                                                  | Lobby → play transition                                          |
| `GAME_ENDED`      | `{ outcome: 'WON' \| 'LOST' }`                        |                                                                  |

```ts
type IntentRejection =
  | 'NOT_YOUR_HERO' // sender does not own state.currentActor
  | 'NOT_YOUR_TURN'
  | 'ILLEGAL_ACTION' // action failed validation against current state
  | 'STALE_STATE' // intent built from a state older than the latest snapshot
  | 'ROOM_BUSY'; // monster phase / transition in progress on host (04)
```

Host intents (the host player acting for their own heroes) bypass the
server and enter the same validation pipeline locally with their own
`playerId` — one code path for validation.

### Keepalive

WS protocol-level pings from the server every 20 s; clients that miss 3
pongs are dropped, triggering `PLAYER_LEFT`. No application-level heartbeat
in v1.

## Intent vocabulary

Intents map 1:1 onto the existing `GameAction` union in `src/types.ts` plus
positional targeting, which today travels through click dispatch. The
intent set is the _gameplay subset_ of `GameAction` — UI-only actions
(inventory toggles, locale, debug, music) are local and never sent.

```ts
type Intent =
  | { type: 'MOVE'; direction: MoveDirection }
  | { type: 'ATTACK'; target: { x: number; y: number } }   // cell, resolved to monster/hero
  | { type: 'OPEN_DOOR'; door: { x: number; y: number } }  // door id coordinates
  | { type: 'PICK_LOCK' }
  | { type: 'SEARCH' }
  | { type: 'INTERACT'; interactableId: string }
  | { type: 'USE_ITEM'; itemId: string }
  | { type: 'SELECT_TARGET'; targetHeroId: string }
  | { type: 'END_ACTION' }
  | { type: 'NEXT_TURN' }
  | { type: 'CHOOSE_EVENT_EFFECT'; ... }   // any event/level-up choice prompt active on state
```

Rules:

- `USE_ITEM` references items by **id**, not by the serialized `Item`
  object (`GameAction.USE_ITEM` carries the object today — the host
  resolves the id against the current state; guests never construct item
  objects).
- Host-side validation reuses the same predicates the UI uses to enable
  buttons (e.g. `canOpenDoor`, action economy via `hero.actions`), then
  applies through the store's existing `dispatchAction` pipeline (05). If
  the UI would not have offered the action, the host rejects with
  `ILLEGAL_ACTION` rather than throwing.
- `CHOOSE_EVENT_EFFECT` is the generic escape hatch for modal decision
  points (event card choices, between-dungeon transitions, level-up
  choices). Its exact payload shape is derived from the decision object
  currently on `state` (e.g. `state.currentEvent`, between-dungeon state).
  If a decision point exists that cannot be expressed as an intent, that is
  a spec bug: file it against this doc, do not special-case it in code.
- Intents carry no state snapshots from the guest. The host validates
  against **its** current state only. The client may attach an
  `expectedTurn` field for its own staleness detection; the host ignores
  it.

## Ordering and delivery guarantees

- One WebSocket = in-order, reliable delivery. No application-level
  sequence tracking for snapshots; a snapshot fully replaces the previous
  one, so at-most-once semantics are inherent.
- The host processes intents sequentially. An intent arriving while the
  turn pipeline is animating (`isTurnInProgress`) is rejected with
  `ROOM_BUSY` — the client re-offers or the player retries. No intent
  queuing on the host in v1.
- Every snapshot includes the full `actionLog`, so a guest that missed
  intermediate snapshots loses nothing.
