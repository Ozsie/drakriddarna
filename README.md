# Drakriddarna

[Board Game Geek](https://boardgamegeek.com/image/4326455/dragonfire)

[Rules inconsistencies](https://boardgamegeek.com/thread/2896557/rules-omissions-ambiguities-and-oddities)

## Creating Campaigns

See [Campaign Readme](src/campaigns/README.md)

## Monster AI: Behavior Selection & Targeting

Monsters in Drakriddarna follow a tactical decision-making and target-scoring system designed to create engaging, unpredictable combat while preventing unfair focus-firing or stalemates.

### 1. Behavior Selection System

On its turn, a monster chooses a tactical behavior composed of two action slots (e.g., Melee + Melee, Shoot + Move to Cover, Move + Melee, or Area Fire Spray).

- **Eligibility Filtering**: Each behavior checks current board context (e.g., adjacent heroes, line of sight, available ranged weapon, or positioning in narrow choke points/corridors). Ineligible behaviors are excluded.
- **Base Weights**: Behaviors have base tactical weights that can scale dynamically (e.g., scaling up if a dragon breath attack can hit multiple heroes, or if a troll can block a 1-tile corridor).
- **Temperament Multipliers**: Monsters have an inherent temperament:
  - **Bold**: +30% weight to aggressive behaviors, -30% to defensive behaviors.
  - **Wary**: +50% weight to defensive behaviors, -20% to aggressive behaviors.
- **AI Director (Dynamic Pacing)**: Adjusts monster aggression based on the heroes' current status:
  - **Ease** (party HP below 45% or an incapacitated hero): Aggressive weights decreased by 30%, defensive increased by 30% to give struggling heroes breathing room.
  - **Push** (party HP above 80% and only 1 monster remaining): Aggressive weights increased by 30%, defensive decreased by 30% to keep combat climactic.
  - **Neutral**: Standard weights apply.
- **Anti-Stall Protection**: If a monster goes 2 consecutive turns without attacking (`passiveStreak >= 2`), defensive behaviors receive 0 weight to prevent infinite kiting and stalling.
- **Equipment Quirks (Forgotten Bow)**: Ranged monsters have a small chance each turn (15% by default, configurable by difficulty) to forget their bow, forcing them into melee/advance tactics.
- **Weighted Selection**: A behavior is selected via weighted random roll among all eligible choices.

### 2. Predefined Monster Behaviors

#### Orcs & Orc Archers (`Orc`, `Orch`)

| Behavior | Action Slots | Tags | Base Weight | Prerequisites / Eligibility |
| :--- | :--- | :--- | :--- | :--- |
| **Brawl** | `melee` + `melee` | Aggressive | 10 | At least one adjacent hero. |
| **Charge** | `move` + `melee` | Aggressive | 8 *(11 if target HP ≤ 50%)* | No adjacent heroes, and a hero is reachable within charge range (≤ 3 steps). |
| **Volley and advance** | `shoot` + `move` | Aggressive, Ranged | 6 (Bold) / 4 (Wary) | Has ranged weapon, bow not forgotten, no adjacent heroes, and at least one hero visible in line of sight. |
| **Reposition and shoot** | `move` + `shoot` | Aggressive, Ranged | 6 (Bold) / 4 (Wary) | Has ranged weapon, bow not forgotten, and can reach a tile within 3 steps with line of sight to a hero. |
| **Advance** | `move` + `move` | Aggressive | 5 | No adjacent heroes, no charge path available, and heroes are visible or pathfindable. |
| **Fall back to cover** | `move_to_cover` + `hold` | Defensive | 4 | No adjacent heroes, no charge path, and at least one cover tile exists within 3 steps. |
| **Ambush** | `hold` + `hold` | Defensive | 3 | No adjacent heroes, no charge path, and heroes are approaching a chokepoint or doorway. |
| **Peek shot** | `shoot` + `move_to_cover` | Defensive, Ranged | 2 | Has ranged weapon, bow not forgotten, visible heroes present, no adjacent heroes, no charge path, and cover exists within 3 steps. |
| **Kite** | `move_away` + `shoot` | Defensive, Ranged | 1.5 | Adjacent hero present, has ranged weapon, bow not forgotten, and can move away within 3 steps to a tile with line of sight. |
| **Hit and run** | `melee` + `move_to_cover` | Defensive | 1 | Adjacent hero present, and valid cover exists within 3 steps. |
| **Retreat** | `move_away` + `move_away` | Defensive | 1 | Monster HP ≤ 1, and alive heroes outnumber alive monsters. |

#### Trolls (`Troll`)

| Behavior | Action Slots | Tags | Base Weight | Prerequisites / Eligibility |
| :--- | :--- | :--- | :--- | :--- |
| **Block the corridor** | `hold` + `melee` | Aggressive | 14 | Adjacent hero present AND troll is located in a 1-tile wide corridor or doorway. |
| **Brawl** | `melee` + `melee` | Aggressive | 10 | At least one adjacent hero. |
| **Charge** | `move` + `melee` | Aggressive | 8 *(11 if target HP ≤ 50%)* | No adjacent heroes, and a hero is reachable within charge range (≤ 3 steps). |
| **Advance** | `move` + `move` | Aggressive | 6 | No adjacent heroes AND no charge path available within 3 steps. |

#### Dark Lords (`Yellow`, `Red`, `Green`, `Blue`)

| Behavior | Action Slots | Tags | Base Weight | Prerequisites / Eligibility |
| :--- | :--- | :--- | :--- | :--- |
| **Spray** | `fire_spray` + `move_or_melee` | Aggressive | 8 + 2 × *(extra heroes hit)* | At least 1 hero is currently in the special attack area / line of fire. |
| **Line up** | `move` + `fire_spray` | Aggressive | 6 | Can reach a tile within 3 steps that aligns one or more heroes in the special attack pattern. |
| **Brawl** | `melee` + `melee` | Aggressive | 5 | At least one adjacent hero. |

#### Default / Fallback Behaviors

Used for custom monsters that do not register dedicated behavior sets:

| Behavior | Action Slots | Tags | Base Weight | Prerequisites / Eligibility |
| :--- | :--- | :--- | :--- | :--- |
| **Brawl** | `melee` + `melee` | Aggressive | 10 | At least one adjacent hero. |
| **Volley** | `shoot` + `shoot` | Aggressive, Ranged | 8 | Has ranged weapon, bow not forgotten, and at least one hero visible in line of sight. |
| **Advance** | `move` + `move` | Aggressive | 5 | Always eligible (fallback movement). |

### 3. Target Selection (Target Scoring)

When choosing which hero to attack or move towards, monsters evaluate all potential candidates using a scoring system:

- **Base Score**: Starts at `10` points.
- **Proximity Penalty**: `-3 points per step needed` to reach the target (monsters prioritize closer heroes).
- **Revenge / Aggro Bonus**: `+3 points` if the hero was the last actor to damage this monster.
- **Anti-Dogpiling (Focus-Fire Prevention)**: `-4 points` if the hero has already been targeted 2 or more times this round, encouraging monsters to distribute attacks across the party.
- **Kill Opportunity Bonus**: `+2 points` (50% notice chance) if the hero's current health is low enough to be eliminated by the monster's expected damage.
- **Tie-Breaking Variation**: `+0 to 3 points` random bonus to avoid purely deterministic targeting and break ties organically.

The hero with the highest final score is selected as the monster's target.

## Todo
- [ ] Reset caved in corridor
- [ ] Multiple saves
- [ ] Diary on mobile
- [ ] Responsive layout
- [ ] Graphics
  - [ ] Sprites for actors
  - [ ] Tileset for dungeons
  - [ ] Sprites for items etc
- [ ] Doors blocking monsters?
- [ ] Trade Items?
- [ ] Alvkonungens Borg -  [Official Dungeon and Heroes](https://cf.geekdo-images.com/vmuWDOTFI7ZB5ekSB21-IQ__imagepagezoom/img/GiEIZp0p97dhk9TawLzxLWxjIiA=/fit-in/1200x900/filters:no_upscale():strip_icc()/pic1072132.jpg)
  - [ ] Edge based walls
- [ ] Level editor
- [X] Use items from radial menu
- [X] Indicators show on not yet revealed monsters
- [X] Fully Canvas UI
- [X] Monster cards
- [X] Earth Hour Campaign - [Dungeons](https://hearthelamentationoftheplayers.home.blog/tag/drakriddarna/)
- [X] Support for additional campaigns
- [X] Dungeon intro screen
- [X] Difficulty levels
- [X] e1m6 - The Final Battle
- [X] e1m5 - The Ice Dragons Treasure
- [X] Select door on click when multiple doors in same cell
- [X] Create function for random item on floor
- [X] Trigger traps when heroes move through a cell with a trap
- [X] Stop search through walls & doors
- [X] Corners
- [X] Green dark lord paralyzing sword
- [X] Magic Item/Weapon: Sword of Chaos
- [X] e1m4 - The Dark Citadel
- [X] Event #16 - The Hexagram
- [X] Show current event
- [X] Translations
- [X] Menu system
- [X] Monster special attack
  - [X] Diagonal fire attack (yellow dark lord)
  - [X] Orthogonal fire attack (red dark lord)
  - [X] In same room & next to fire attack (green dark lord)
  - [X] All of the above (blue dark lord)
- [X] Hints for secrets
- [X] e1m3 - Labyrinth of Horror
- [X] Show level win conditions & button to move on
- [X] Linting
- [X] Secrets
- [X] Drop Items
- [X] Monster blocking move on click move
- [X] Render pillars & pits
- [X] Render on demand
- [X] Click movement must take LoS into account for range
- [X] e1m2 - Mines of Evil
- [X] Events
- [X] e1m1 - The Three Gates of Power
- [X] Magic Items
- [X] Centering on spawn
- [X] Split game.ts, move code out of routes
- [X] Line of sight
- [X] Monster range attack
- [X] Move render code to .ts files
- [X] Items
- [X] Clearing dungeon
- [X] Trap Doors
- [X] Moving through other heroes
- [X] Levelling up
- [X] e1m0 - Troll Cave
- [X] Hidden doors
- [X] Trapped doors
- [X] Monster movement
- [X] Monster close combat attack
- [X] Locked doors
- [X] Saving & loading

## Controls
### Mouse/touch
* Click in the tile you want to move to
* Click the active hero to open a door, if next to one
* Click the active hero to pick a lock, if next to locked door
* Click the active hero to search
* If within range of a monster, click it to attack

### Keyboard
| Action     | Numpad | Keyboard |   |   |
|------------|--------|----------|---|---|
| Up         | 8      | W        |   |   |
| Left       | 4      | A        |   |   |
| Down       | 2      | X        |   |   |
| Right      | 6      | D        |   |   |
| Up Left    | 7      | Q        |   |   |
| Down Left  | 1      | Z        |   |   |
| Up Right   | 9      | E        |   |   |
| Down Right | 3      | C        |   |   |
| Pick lock  | -      | R        |   |   |
| Search     | +      | F        |   |   |
| Next       | 0      | space    |   |   |

## Developing

Once you've installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```
