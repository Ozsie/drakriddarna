# Randomized Campaign — Specification & Agent Guidelines

This folder contains the complete specification for a **self-contained,
randomized campaign**: a fixed chain of 10 procedurally generated dungeons of
increasing size and difficulty, produced by a Brogue-inspired generation
algorithm. The campaign lives entirely inside its own campaign folder —
**no core logic changes are required or allowed** for this feature.

The existing `src/campaigns/brogue/` folder (three hand-shaped 20x20
dungeons with organic, cave-like room blobs) is the visual reference for what
the generator must produce, and is replaced by generated output when the
work is done.

## Scope decisions (already made — do not relitigate)

| Decision | Choice |
|---|---|
| Campaign length | Exactly 10 dungeons (the existing enemy and item pool scales well for 6–15) |
| Generation time | At campaign module load (`campaign.ts` top level), never at authoring time |
| Determinism | One fixed campaign seed constant; per-dungeon seed = `hash(seed, depth, attempt)`. Same seed always produces the same 10 dungeons |
| Core changes | None. The campaign is registered by the existing auto-discovery (`src/campaigns/index.ts`) and uses only public authoring surfaces (`defineDungeon`, `defineLayout`, declarative types) |
| Generation algorithm | Brogue-inspired, adapted to the lettered-room grid: seeded room placement, organic blob growth, forced connectivity, doors on shared edges, rejection sampling on validation failure |
| Win conditions | `ConditionType.KILL_ALL` on every floor, matching the existing brogue dungeons |
| Monster pool | Built-in ORC / TROLL / dark lords, plus 1–2 new mid-tier monster templates registered inside the campaign folder via `registerMonsterTemplate` |
| Validation | Every generated dungeon must pass `assertValidDungeon` (the default of `defineDungeon`); on failure the generator retries with a new attempt seed, with a bounded retry count and a known-good fallback seed |
| RNG source | The seedable rng in `src/core/dice.ts`; `Math.random()` is forbidden in generator code |
| Static dungeons | The three files in `src/campaigns/brogue/dungeons/` are deleted once generation works end to end |
| Non-goals (v1) | Truly infinite chains (`nextDungeonFactory` hooks), user-chosen seeds, new terrain types, new mechanics beyond what the existing types support |

### Rationale for the two biggest calls

**Generate at module load, not at authoring time or lazily.**
`src/campaigns/index.ts` eagerly imports every `src/campaigns/*/campaign.ts`
via `import.meta.glob`, so top-level generation code runs once per app start
and costs milliseconds for ten small grids. Because `Dungeon.nextDungeon` is
an object (not a factory) and nothing re-enters campaign code at victory
time (`src/dungeon/BetweenDungeonsLogic.ts` just reads the chain), the only
zero-core-change way to get a full chain is to have it fully built when the
campaign object is constructed. Ten pre-generated dungeons bounded by the
content pool's scaling range make "infinite" unnecessary.

**Fixed seed, deterministic output.** Determinism is already a repo rule for
gameplay-affecting randomness, and it additionally makes the campaign
save-safe (a save stores the same `Dungeon` chain every load), snapshot-test
friendly (deep-equality of two generations of the same seed), and reviewable
(the whole campaign can be rendered to a fixture for inspection).

## Reading order

| Doc | Contents |
|---|---|
| [01-architecture.md](./01-architecture.md) | Integration points, module layout, data flow, constraints of load-time generation |
| [02-generation-algorithm.md](./02-generation-algorithm.md) | The Brogue-adapted algorithm: room seeding, blob growth, connectivity, doors, rejection sampling |
| [03-difficulty-curve.md](./03-difficulty-curve.md) | The depth 1–10 config table, monster pool and budget system, population rules |
| [04-milestones.md](./04-milestones.md) | Implementation phases M1–M5, each with a definition of done |

## How to brief an agent

Give the agent this folder as its specification and tell it:

- The game repository is the authority for every type the generator emits.
  The authoritative definitions are `src/types.ts` (`Dungeon`, `Layout`,
  `DeclarativeLayout`, `Campaign`), `src/dungeon/dungeonParser.ts`
  (`defineDungeon` / `defineLayout` and the tuple shorthands) and
  `src/dungeon/dungeonValidator.ts` (structural rules). Where the spec and
  the game source disagree, the game source wins.
- Read the docs in numbered order before writing code.
- Work milestone by milestone (04); each milestone has an explicit
  definition of done including tests.
- All generator code lives inside the campaign folder and obeys the repo's
  existing constraints: strict TypeScript (no `any`, no `console` — use the
  logger if logging is needed), seeded rng only, colocated `*.test.ts`,
  prettier single quotes / 2-space indent, every user-facing string in both
  `en` and `sv` via sveltekit-i18n.
- Run `npm run check`, `npm test`, `npm run lint` and `npm run prettier`
  before considering work done.

## Glossary

- **Depth** — the 1-based index of a dungeon in the chain (floor number).
- **Blob** — the organic, cave-like floor shape grown for one room letter.
- **Room letter** — the single character that fills a room's cells in the
  `Layout.grid`; drives room discovery, doors and fog.
- **Attempt** — one rejected generation try; the attempt number feeds the
  per-dungeon seed so retries are deterministic too.
- **Rejection sampling** — generate, validate, retry with a new attempt
  seed if invalid, up to a bound; the same approach the original Brogue
  generator uses.
