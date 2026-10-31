# 04 — Session Lifecycle

From "Create room" to "Host left": the room as a state machine, who may act
when, and what happens on disconnects.

## Room states

```
LOBBY ── all players READY ──▶ IN_GAME ──▶ ENDED
  │                              │
  └── host leaves ──▶ CLOSED ◀────┘ host leaves / LOST / WON / idle timeout
```

- **LOBBY** — room created, hero claiming and readiness. The host has
  already chosen campaign and Game Master at `CREATE_ROOM`; the game state
  does not exist yet (host has not called `init`).
- **IN_GAME** — `GAME_STARTED` broadcast; host runs `init(campaignId,
gameMasterId)` and sends the first snapshot.
- **ENDED** — win or loss (`GAME_ENDED`), or the room closed (`ROOM_CLOSED`).

The server tracks LOBBY/IN_GAME/CLOSED coarsely (it needs to reject joins
after start). Host-only states (monster phase, transitions) are invisible to
the server.

## Roles and hero claiming

- **Host player** — created the room. In LOBBY they may also _release_ heroes
  back to the pool. The host acts for any **unclaimed** hero on their turn —
  unclaimed heroes are host-controlled in v1 (the alternative — auto-skip —
  is a rules question; host control matches the board game's "one player
  runs the extras" convention).
- **Guests** — claim one or more heroes via `CLAIM_HEROES`; the host
  arbitrates conflicts (first claim wins; `PLAYER_JOINED`-style broadcasts
  carry the current `claimedHeroIds` per player, so clients can render
  claim state without extra messages).
- **Readiness** — each player toggles `READY`. The host broadcasts
  `GAME_STARTED` only when every player is ready. This is the only lobby
  gate; v1 has no re-lobby between dungeons.

Claiming is per-campaign-hero (hero ids from the campaign definition),
validated against `state.heroes` after init.

## Turn flow in IN_GAME

The single-writer rule from 01, concretely:

1. **Hero turns.** `state.currentActor` is a hero. The client owning that
   hero enables input; everyone else's board is read-only (05). Intents
   flow guest → host; the host player's own actions enter the same pipeline
   locally.
2. **Host validates** (ownership, not-busy, legality) and applies through
   the existing store pipeline. One `SNAPSHOT` per applied intent.
3. **`END_ACTION` / `NEXT_TURN` and the monster phase.** The existing
   functions are async and animate monster behavior via callbacks. On the
   host they run with animations on (the host player watches them live).
   During this window the host rejects new intents with `ROOM_BUSY`.
   Guests see the phase as: snapshot (hero acted) → "monsters acting"
   banner → snapshot (phase settled, next hero's turn).
4. **Monster animation on guests.** v1 does not stream per-monster
   snapshots. Each client replays the monster phase locally from the _log_
   (monster actions are already logged with positions/outcomes) — the same
   animation code paths the host used, driven by log entries, with a time
   cap (if the guest joins or falls behind, animations are skipped, not
   queued). Guests may offer a "skip animations" client setting that
   simply doesn't replay.
5. **Decision points** (event cards, between-dungeon transitions, level-up
   choices) — expressed as `CHOOSE_EVENT_EFFECT` intents from the player
   who owns the deciding hero (or the host for unclaimed/party-wide
   decisions). The modal blocks the room the same way `ROOM_BUSY` does
   until resolved.

If an intent fails inside the pipeline (exception, unexpected state), the
host rejects with `ILLEGAL_ACTION`, does **not** broadcast, and logs. The
host's state is authoritative and untouched by failed intents.

## Persistence policy

- The host saves exactly as in single-player: `save(state)` →
  `localStorage`, reload guard active. A host who refreshes mid-game
  resumes solo or re-hosts (below).
- Guests never persist. Their reload guard is inactive during a session.
- The room does not store the game. If the server restarts, the room is
  gone; the host's `localStorage` save is the only recovery path (host can
  re-create a room from it — v1 accepts that the room code changes).

## Disconnects and reconnects

| Event                                          | Behavior                                                                                                                                                                           |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guest socket drops                             | Server broadcasts `PLAYER_LEFT`. Their heroes become unclaimed → host-controlled. Game continues.                                                                                  |
| Guest reconnects                               | v1: a fresh `JOIN_ROOM` against an IN_GAME room is rejected (`GAME_STARTED`). **Guests who drop mid-game are spectators-to-be, not rejoiners** — mid-game rejoin is a v1 non-goal. |
| Host socket drops                              | Server closes the room, broadcasts `ROOM_CLOSED` to everyone. No host migration (README). Guests see the room-lost screen; their last snapshot is final.                           |
| Server restarts / idles out                    | `ROOM_CLOSED`. Clients attempt one reconnect on socket close (socket-level), then show the room-lost screen.                                                                       |
| Guest tab hidden / network flap < ping timeout | WS survives; nothing special.                                                                                                                                                      |

The host-refresh problem (host reloads the page mid-game, room dies) is
accepted in v1 and the room-lost screen says so plainly. A "re-host from
save" flow is a documented phase 2 candidate, not v1 scope.

## End of game

`GAME_ENDED { outcome }` on win/loss. The room stays open in ENDED state
until everyone leaves or the idle TTL closes it — players can look at the
final board. Campaign progression to the next dungeon (between-dungeons
flow) is part of IN_GAME: it happens via `CHOOSE_EVENT_EFFECT` intents and
continues the same room.
