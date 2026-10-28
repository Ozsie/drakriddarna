# 04 — Milestones

Work the milestones strictly in order; each one's definition of done must
be satisfied before the next begins. All code lives in the campaign folder
(see 01). Repo-wide definition of done (`npm run check`, `npm test`,
`npm run lint`, `npm run prettier`) applies to every milestone.

## M1 — Rig: rng and config

Deliverables:

- `generator/rng.ts`: deterministic rng wrappers over the seedable rng in
  `src/core/dice.ts` — read its actual API first and wrap it; if its
  interface does not fit stream-style generation (seeded generator over
  multiple draws), implement a local mulberry32-style PRNG **seeded from
  `dice.ts`'s seeded value** so gameplay randomness still flows through
  the sanctioned source. Provide `pick`, `weightedPick`, `shuffle`,
  `intInRange`, `chance`.
- `generator/config.ts`: the depth table from 03 as typed data
  (`DepthConfig`), plus the door-option probabilities and the derived
  budget formulas.

Definition of done:

- `rng.test.ts`: same seed → same draw sequence; different seeds diverge;
  `hash(CAMPAIGN_SEED, depth, attempt)` differs per depth and attempt;
  distributions sanity-checked (bounded-range draws stay in range).
- `config.test.ts`: table is total over depths 1–10; budgets are
  monotonically non-decreasing.

## M2 — Layout generator

Deliverables:

- `generator/layoutGenerator.ts`: steps 1–5 of 02 (room seeding, blob
  growth, walls/adjacency, doors, start room), returning a
  `DeclarativeLayout` (grid + door tuples only).

Definition of done:

- `layoutGenerator.test.ts`:
  - Same `(seed, depth)` → deep-equal layout (snapshot one representative
    depth).
  - Room graph connected via doors for a property-test sweep of >= 100
    seeds per depth bucket (fast grids, so this is cheap).
  - No room letter without a door; no monster/hostile placement conflicts
    (nothing but grid and doors emitted here).
  - Grid rows uniform length; only expected characters (`a`..`j`, `#`,
    space).
  - Locked doors never on articulation points of the door graph.
- A rendered-fixture test that generates depth 1, 5 and 10 and passes each
  through `defineDungeon` with default validation — proving the validator
  accepts generator output.

## M3 — Population

Deliverables:

- `monsters/templates.ts`: the 1–2 campaign-local mid-tier monster
  templates from 03, registered via `registerMonsterTemplate` at campaign
  module load.
- `generator/populationGenerator.ts`: budget-based monster selection and
  placement, item/secret/event placement per the 03 rules.

Definition of done:

- `populationGenerator.test.ts`:
  - Monster XP sum equals the floor budget (boss deducted first).
  - Availability tiers respected (no TROLL before depth 3, boss exactly on
    floors 5 and 10).
  - No monster in the start room on depth 1; per-room monster caps hold.
  - All placements on floor cells, never on doors/walls/void or occupied
    cells.
- The new monster templates have their own tests for the registered stats
  (mirroring the existing `MonsterLogic` test style).

## M4 — Assembly, campaign wiring, i18n

Deliverables:

- `generator/generateCampaign.ts`: the retry loop from 02 step 6 with
  `MAX_ATTEMPTS = 50` and per-depth fallback seeds; builds the
  `nextDungeon` chain.
- `campaign.ts` reworked: imports `generateCampaign`, keeps the decks and
  hero construction, exposes the generated chain.
- `translations/en.json` / `sv.json`: campaign name plus floor
  name/intro templates using sveltekit-i18n interpolation for the floor
  number (verify the interpolation syntax the repo's i18n setup supports
  before committing to the key shape; if interpolation is unavailable for
  these strings, fall back to 10 explicit per-floor keys).
- Delete `src/campaigns/brogue/dungeons/` and its imports.

Definition of done:

- The campaign loads through the real auto-discovery path (a test that
  imports `src/campaigns/index.ts` and finds the campaign with 10 chained
  dungeons).
- `generateCampaign.test.ts`: same campaign seed → deep-equal chains; all
  10 depths validate; retry counter test with a poisoned seed confirming
  the fallback path returns a valid dungeon instead of throwing.
- Both languages resolve every emitted translation key (no hardcoded
  user-facing strings).

## M5 — Verification and balancing

Deliverables:

- Property sweep: 100 seeds x 10 depths generate and validate with zero
  failures and zero fallback activations (the fixed campaign seed is, of
  course, among them).
- `npm run balanceAnalysis` run; monster budget table tuned per the
  balancing procedure in 03 (seed unchanged; only `config.ts` values move).
- TECHNICAL.md: one short paragraph in the appropriate section describing
  the runtime-generated campaign (load-time generation, deterministic
  seed, rejection sampling), per the repo rule that the write-up must not
  drift.
- Optional, cheap and valuable: a dev-only fixture export (a script or
  test that dumps all 10 grids as text) so layouts can be eyeballed
  during review without running the game.

Definition of done:

- `npm run check`, `npm test`, `npm run lint`, `npm run prettier` all
  green.
- Balance analysis output reviewed; the XP-curve risk from 03 addressed or
  explicitly accepted.
- Manual smoke test in `npm run dev`: start the campaign, clear floor 1,
  confirm the between-dungeons flow advances to floor 2, save and reload
  mid-chain and confirm the chain survives persistence.
