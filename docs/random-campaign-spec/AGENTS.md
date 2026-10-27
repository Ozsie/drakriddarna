# Drakriddarna Randomized Campaign

A self-contained campaign of 10 procedurally generated dungeons of
increasing size and difficulty, produced by a Brogue-inspired algorithm at
campaign load time. Fixed seed, deterministic output, rejection sampling
against the existing dungeon validator.

## Specification

The full spec lives in [`docs/random-campaign-spec/`](./). It is
authoritative for architecture, the generation algorithm, the difficulty
curve, and milestones.

Read it in this order before writing any code:

1. `README.md` — scope, decisions already made
2. `01-architecture.md` — integration points, module layout, constraints
3. `02-generation-algorithm.md` — the algorithm and its invariants
4. `03-difficulty-curve.md` — the depth table and population rules
5. `04-milestones.md` — M1–M5 with definitions of done

Where the spec and the game source disagree, **the game source wins**
(`src/types.ts` for `Dungeon`/`Layout`/`Campaign`,
`src/dungeon/dungeonParser.ts` for the authoring DSL,
`src/dungeon/dungeonValidator.ts` for structural rules).

## Repository layout

- All new code lives inside the campaign folder
  (`src/campaigns/brogue/`, or a new sibling folder with a different
  campaign `id` if renamed). Nothing outside a campaign folder is touched.
- The generator emits plain `DeclarativeLayout`/`DeclarativeDungeon` data
  and goes through `defineDungeon` like hand-authored content.

## Non-negotiable rules

- **No core changes.** The campaign registers through the existing
  auto-discovery and uses only public authoring surfaces. If a core change
  seems required, stop and surface it — do not slip it in.
- Generation is deterministic: the seed is a fixed constant, per-dungeon
  seeds derive as `hash(CAMPAIGN_SEED, depth, attempt)`, and all
  randomness flows through the seedable rng in `src/core/dice.ts` (never
  `Math.random()`, never `Date.now()`).
- Generation happens at campaign module load and must never throw: the
  retry loop is bounded and falls back to known-good seeds.
- Every generated dungeon passes `assertValidDungeon`; the locked-door and
  reachability invariants in 02 hold on every attempt, not just accepted
  ones.
- All user-facing strings in both `en` and `sv` via sveltekit-i18n; no
  hardcoded text.
- Strict TypeScript, no `any`, no `console` (use the logger if logging is
  genuinely needed); colocated `*.test.ts` per module; prettier single
  quotes and 2-space indent.
- Do not add user-chosen seeds, infinite-chain hooks (`nextDungeonFactory`),
  or any v1 non-goal from the spec README. Do not build these unasked.

## Working discipline

Work through milestones M1–M5 in `04-milestones.md` strictly in order; each
milestone's definition of done must be satisfied before the next begins.
Balancing (M5) tunes `config.ts` values only — the seed never changes.
