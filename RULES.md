# Drakriddarna: Official Rules & Player Guide

Welcome to **Drakriddarna** (Dragonfire), a tactical turn-based dungeon-crawling board game adaptation. Lead a party of heroes through peril-filled dungeons, battle cunning monsters, discover hidden rooms and treasures, and defeat the Dark Lords to conquer campaigns.

---

## Table of Contents

1. [Beginner's Quickstart Guide](#beginners-quickstart-guide)
   - [Objective](#objective)
   - [User Interface & Controls](#user-interface--controls)
   - [Turn Structure at a Glance](#turn-structure-at-a-glance)
   - [Essential Beginner Tips](#essential-beginner-tips)
2. [Hero Attributes & Progression](#hero-attributes--progression)
   - [Core Hero Attributes](#core-hero-attributes)
   - [Level Progression & Dice Thresholds](#level-progression--dice-thresholds)
   - [Action Economy](#action-economy)
   - [Movement & Zone of Control](#movement--zone-of-control)
3. [Combat & Damage Resolution](#combat--damage-resolution)
   - [Attacking](#attacking)
   - [Defense, Armor, and Shields](#defense-armor-and-shields)
   - [Damage Calculation](#damage-calculation)
   - [Status Effects](#status-effects)
4. [Dungeon Exploration & Interaction](#dungeon-exploration--interaction)
   - [Doors & Portals](#doors--portals)
   - [Searching for Secrets & Traps](#searching-for-secrets--traps)
   - [Pitfalls & Hidden Hazards](#pitfalls--hidden-hazards)
   - [Interactables & Dungeon Notes](#interactables--dungeon-notes)
5. [Equipment & Items](#equipment--items)
   - [Weapons](#weapons)
   - [Armour & Shields](#armour--shields)
   - [Magic Items & Consumables](#magic-items--consumables)
6. [Game Masters & Difficulty Settings](#game-masters--difficulty-settings)
   - [Pluggable Game Master System](#pluggable-game-master-system)
   - [Comparison Overview](#comparison-overview)
   - [Key Mechanics & Distinct Personas](#key-mechanics--distinct-personas)
7. [Monster AI: Behavior Selection & Targeting](#monster-ai-behavior-selection--targeting)
   - [1. Behavior Selection System](#1-behavior-selection-system)
   - [2. Predefined Monster Behaviors](#2-predefined-monster-behaviors)
   - [3. Target Selection (Target Scoring)](#3-target-selection-target-scoring)
8. [Turn Events & Difficulty Scaling](#turn-events--difficulty-scaling)
   - [Monster Spawn Events](#monster-spawn-events-the-hungry-troll-the-lost-orc)
   - [Recovery Events](#recovery-events-fountain-of-youth)

---

## Beginner's Quickstart Guide

### Objective

Each dungeon scenario presents specific win conditions (e.g., eliminating all monsters, finding a specific relic, defeating a boss, or reaching the dungeon exit). Your party of heroes must explore the dungeon room by room, survive enemy encounters, and fulfill the objectives before the party is wiped out.

### User Interface & Controls

#### Mouse / Touch Controls
- **Move**: Click on any highlighted or walkable tile within range to move there.
- **Attack**: Click on an adjacent enemy (or a visible enemy in range if wielding a reach/ranged weapon) to initiate an attack.
- **Interact / Open Door**: Click the active hero when standing next to a door or interactable object (or use the radial action menu).
- **Radial Menu / Inventory**: Click the active hero to open action options (Search, Pick Lock, Inventory, End Turn) or click the hero card at the bottom to view stats and manage inventory.

#### Keyboard Controls

| Action | Keyboard | Numpad | Description |
| :--- | :---: | :---: | :--- |
| **Move Up** | `W` | `8` | Move one tile north |
| **Move Down** | `X` | `2` | Move one tile south |
| **Move Left** | `A` | `4` | Move one tile west |
| **Move Right** | `D` | `6` | Move one tile east |
| **Move Up-Left** | `Q` | `7` | Move one tile northwest |
| **Move Up-Right** | `E` | `9` | Move one tile northeast |
| **Move Down-Left** | `Z` | `1` | Move one tile southwest |
| **Move Down-Right** | `C` | `3` | Move one tile southeast |
| **Search** | `F` | `+` | Search current area for hidden doors, chests, or traps |
| **Pick Lock** | `R` | `-` | Attempt to pick the lock of an adjacent locked door |
| **Next / End Turn** | `Space` | `0` | End current hero's turn and pass to the next hero |

### Turn Structure at a Glance

A game round proceeds in three distinct phases:

1. **Hero Phase**:
   - Each surviving hero takes a turn in sequential order.
   - On a hero's turn, they receive **2 Actions** and their max **Movement Points** (typically 3 tiles).
   - The hero can move, attack monsters, search for hidden secrets, pick locks, or use items.
2. **Monster Phase**:
   - After all heroes have ended their turns, all active monsters on the board take their actions.
   - Monsters evaluate tactical behaviors (melee brawls, ranged shots, charge attacks, kiting, or fire sprays) and select targets using AI scoring.
3. **Turn Event Phase**:
   - The round counter increments (`Turn Count + 1`).
   - If monsters are present or events are enabled, an **Event Card** is drawn from the Event Deck, triggering environmental effects, monster reinforcements, or status updates.

### Essential Beginner Tips

1. **Stick Together**: Do not rush ahead with a single hero. Revealing a room with multiple monsters will trigger their aggression. Move your party in formation so all heroes can support each other.
2. **Beware the Zone of Control**: Moving into a tile adjacent to a monster immediately exhausts all remaining movement points for that move step. Position carefully so you aren't stranded in reach of multiple enemies.
3. **Search Suspicious Rooms**: Always use the **Search** action (`F`) in rooms with dead ends or odd layouts. Secret passages and hidden chests containing vital magic weapons and healing potions can turn the tide of battle.
4. **Level Up Priority**: Lower-level heroes roll with a higher difficulty threshold (5+ on d6). When heroes gain enough Experience to reach **Knight** level (4 XP), their roll threshold drops to 4+, substantially increasing both attack damage and shield blocking consistency.
5. **Manage Doorways**: Doorways act as natural choke points. Funnel monsters into narrow 1-tile passages where only one enemy can attack at a time.
6. **Watch Out for Traps**: Unsearched rooms may harbor pitfall trap doors. Walking blindly through unrevealed tiles risks taking pit damage and suffering incapacitation for a turn.

---

## Hero Attributes & Progression

### Core Hero Attributes

Each hero has the following primary characteristics:

- **Health (HP)**: Baseline maximum is `7 HP` (modified by difficulty: `6 HP` on Hard). If a hero's health reaches 0, they fall incapacitated.
- **Actions**: Baseline `2 Actions` per turn.
- **Movement**: Baseline `3 Movement Points` per turn (modified by difficulty: `4` on Easy, `2` on Hard, and reduced by heavy armor such as Plate Mail).
- **Level**: Defines the success threshold on all 6-sided dice rolls (d6).
- **Equipment Slots**: Equipped **Weapon**, **Shield**, **Armour**, and a general **Inventory** for magic items and potions.

### Level Progression & Dice Thresholds

Every test in Drakriddarna—combat attacks, shield defense blocks, lockpicking, and searching—is resolved using standard 6-sided dice (**d6**).

The required face value for a die to count as a **Success** depends directly on the character's **Level**:

| Level | Required Experience (XP) | Dice Roll Success Threshold | Success Chance per Die |
| :--- | :---: | :---: | :---: |
| **Apprentice** | 0 XP | **5+** (rolls of 5 or 6) | 33.3% |
| **Knight** | 4 XP | **4+** (rolls of 4, 5, or 6) | 50.0% |
| **Hero** | 10 XP | **4+** (rolls of 4, 5, or 6) | 50.0% |
| **Lord** | 18 XP | **3+** (rolls of 3, 4, 5, or 6) | 66.7% |
| **Master** | 28 XP | **3+** (rolls of 3, 4, 5, or 6) | 66.7% |

#### Gaining Experience
- Whenever an enemy monster is slain, **every surviving hero in the party earns +1 Experience (XP)**.
- If all heroes fall in battle, the scenario restarts with revived heroes starting at 0 XP (Apprentice level).

### Action Economy

A hero receives **2 Actions** at the start of their turn:

- **Moving**: Moving costs movement points (1 point per tile). When a hero runs out of movement points while they still have an action remaining, 1 action is consumed to replenish movement points back to their max.
- **Standard Actions (Attack, Search, Pick Lock, Interact)**:
  - If performed with full movement points remaining (before taking any steps), performing the action consumes **1 Action**.
  - If performed after already taking partial movement steps during the current turn, performing the action consumes **all remaining actions** for that turn.
- **Ending Turn**: A hero can end their turn at any time using the `Space` key or radial menu, passing play to the next party member.

### Movement & Zone of Control

- **8-Directional Movement**: Heroes and monsters can move horizontally, vertically, and diagonally across walkable tiles.
- **Zone of Control / Monster Engagement**: Moving into any tile adjacent to an enemy monster immediately halts the hero's movement (remaining movement is reduced to `0`).
- **Obstacles**: Heroes cannot move through solid walls, closed doors, collapsed rubble, pits, or tiles occupied by live monsters.

---

## Combat & Damage Resolution

### Attacking

When a hero attacks an enemy (or a monster attacks a hero):

1. **Determine Dice Pool**:
   $$\text{Attack Dice} = \text{Weapon Dice} + \text{Item Bonuses} + \text{Elemental Bonus} + \text{Attack Modifiers} - \text{Status Debuffs}$$
2. **Roll Dice**: Roll the resulting number of d6 dice against the attacker's Level success threshold. Count the total number of **Hits**.

### Defense, Armor, and Shields

The defender protects themselves through armor and shields:

1. **Armour Value**: Provides passive flat damage reduction (e.g., Chain Mail = 1, Plate Mail = 2, Dark Lord Cape = 2).
2. **Shield Roll**: If equipped with a shield, the defender rolls the shield's dice pool (e.g., Small Shield = 1 die, Large Shield = 2 dice) against their own Level threshold. Each success adds **+1 Shield Block**.
3. **Defense Modifiers**: Any global difficulty defense modifiers apply.

*Special properties:*
- Attacks marked `ignoresArmour` bypass passive armor reduction.
- Attacks marked `ignoresShield` (e.g., Orc bows, Sword of Chaos) bypass shield defense rolls.

### Damage Calculation

The final damage inflicted on the target is:

$$\text{Final Damage} = \max\Big(0,\; \text{Hits} - \big(\text{Armour Defense} + \text{Defense Modifiers} + \text{Shield Blocks}\big)\Big)$$

- The target's current Health is reduced by the Final Damage.
- If health drops to `0` or below, the target is defeated.
- When an attack deals damage equal to or exceeding the weapon's maximum unmodified base dice minus armor, it registers as a **Critical Hit** with special visual indicators.

### Status Effects

Heroes and monsters may be affected by temporary conditions:

- **Blinded**: Suffers `-1 Attack die` penalty; unable to search for secrets or pick locks.
- **Weakened**: Suffers `-1 Attack die` penalty on all weapon attacks.
- **Incapacitated**: Triggered by pitfall traps or heavy debilitating effects. The hero is immobilized and skips their next turn to recover.
- **Elemental Weapon**: Imbues attacks with `+1 Attack die`.

---

## Dungeon Exploration & Interaction

### Doors & Portals

Dungeons are divided into distinct rooms and corridors separated by doors:

- **Standard Doors**: Moving into the doorway opens the door and immediately reveals the connected room, illuminating its layout and revealing any monsters inside.
- **Locked Doors**: Cannot be opened by simple movement. A hero standing at the door can attempt to **Pick Lock** (`R`), rolling 1 die against their Level threshold. Alternatively, items with the `BREAK_LOCK` property (like the *Giant's Glove* or *Ring of the Ram*) instantly smash the lock.
- **Trapped Doors**: Open like normal doors but detonate a trap attack against the hero upon opening.
- **Reinforced Doors**: Heavy reinforced iron doors that cannot be opened or picked without the *Giant's Glove*.
- **Hidden Doors**: Secret doors concealed within walls. They only appear when revealed by a successful **Search** action.

### Searching for Secrets & Traps

Using the **Search** action (`F`) scans the current room/corridor for concealed elements:

- **Search Roll**: Rolls 1 die (+ Search items bonus + Difficulty search modifier) against the hero's Level threshold.
- On a success, the hero reveals one of the following in priority order:
  1. Hidden **Pitfall Trap Doors**
  2. **Hidden Secret Doors** in nearby walls
  3. Concealed **Room Traps**
  4. Hidden **Treasure Chests** or **Secret Items**
  5. Secret **Interactable Objects** (levers, hidden altars)

### Pitfalls & Hidden Hazards

- **Trap Doors / Pitfalls**: Hidden trap doors lie flush with the floor. If a hero steps onto an undiscovered trap door, they trigger a pitfall, take trap damage, lose all remaining actions and movement, and become **Incapacitated** for the round. Searching beforehand reveals the pit safely.

### Interactables & Dungeon Notes

- **Interactable Objects**: Fountains, levers, chests, altars, and sarcophagi can be triggered using the Interact action or radial menu.
- **Dungeon Notes**: Parchment scrolls and wall inscriptions provide lore, warnings, and clues to puzzle solutions. Moving over a note automatically reads it.

---

## Equipment & Items

### Weapons

| Weapon | Range | Attack Dice | Properties |
| :--- | :---: | :---: | :--- |
| **Sword** | 1 (Melee) | 3 | Standard one-handed blade. Starting weapon for heroes. |
| **Two-Handed Sword** | 1 (Melee) | 4 | Heavy blade. Two-handed (cannot be used with a shield). Cannot be used if adjacent to friendly heroes. |
| **Halberd** | 2 (Reach) | 3 | Long polearm allowing melee attacks up to 2 tiles away. Two-handed. |
| **Flail** | 1 (Melee) | 4 | Powerful one-handed crushing weapon. |
| **Double-Headed Axe** | 1 (Melee) | 4 | Heavy cleaving axe. Two-handed. |
| **Orc Bow** | Ranged | 3 | Monster ranged weapon. Ignores shield blocking. |

### Armour & Shields

| Item | Type | Defense / Dice | Special Properties |
| :--- | :---: | :---: | :--- |
| **Small Shield** | Shield | 1 die | Adds 1 shield defense roll against incoming attacks. |
| **Large Shield** | Shield | 2 dice | Adds 2 shield defense rolls against incoming attacks. |
| **Chain Mail** | Armour | 1 Flat Def | Provides 1 flat damage reduction. No movement penalty. |
| **Plate Mail** | Armour | 2 Flat Def | Heavy protection. Reduces hero max movement by `-1 tile`. |
| **Dragon Skin Mail** | Armour | 2 Flat Def | Superior protection. Provides magic protection with 0 movement penalty. |

### Magic Items & Consumables

- **Healing Herbs** (`🌿`): Restores health to any designated hero. Refreshes each scenario.
- **Boots of Speed**: Grants a permanent passive `+1 Movement` bonus to the wearer.
- **Giant's Glove**: Imbues attacks with `+1 Attack die`, smashes locked doors, and allows forcing open Reinforced Doors.
- **Ring of Precision**: Allows re-rolling failed attack rolls once per combat round.
- **Crown of Wisdom**: Grants a permanent `+1 Search bonus` die to all search attempts.
- **Potion of Speed** (`⚡`): Grants `+2 extra Actions` for the current turn.
- **Necklace of Light** (`📿`): Activates a radiant aura that dispels darkness and blindness effects.
- **Sword of Chaos**: A mystical 4-dice weapon that ignores both armor and shields, but inflicts unpredictable chaos effects on combatants.

---

## Game Masters & Difficulty Settings

Drakriddarna uses a pluggable **Game Master (GM)** system that unifies difficulty levels, hero modifiers, starting equipment, AI director pacing, monster behavior weights, and event deck manipulation. After choosing a campaign, players select a Game Master to guide their adventure.

### Pluggable Game Master System

Rather than relying purely on static stat adjustments, Game Masters provide distinct tabletop narrative styles and AI personalities. Drakriddarna ships with three primary Game Masters representing classic difficulty tiers:

- **Story Teller** (`storyTeller` / *Easy*): A forgiving narrator focused on adventure flow, offering generous hero modifiers, bonus search capabilities, starting shields, high archer distraction rates, and responsive AI easing when heroes are wounded.
- **Tactician** (`tactician` / *Normal / Default*): A balanced, tactical Game Master offering fair, classic tabletop pacing without artificial buffs or penalties.
- **Brutal Overlord** (`brutalOverlord` / *Hard*): A ruthless dungeon master who suppresses hero health and movement, spawns monsters in close proximity, aggressively pushes monster behaviors, and grants no quarter.

### Comparison Overview

| Game Master | Difficulty Equivalent | Attack Mod | Defense Mod | Movement Mod | Search Mod | Health Mod | Starting Equipment | Bow Forgotten Chance | Min Spawn Distance | Earliest Spawn Round | Low-Health Troll Safeguard |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :---: |
| **Story Teller** | Easy | +1 | 0 | +1 | +2 | 0 | Sword + Small Shield | 25% | 4 tiles | Round 4 | Enabled (Party HP < 50%) |
| **Tactician** *(Default)* | Normal | 0 | 0 | 0 | 0 | 0 | Sword | 15% | 3 tiles | Round 3 | Enabled (Party HP < 50%) |
| **Brutal Overlord** | Hard | 0 | 0 | -1 | 0 | -1 | Sword | 0% | 1 tile | Round 2 | Disabled |

---

### Key Mechanics & Distinct Personas

1. **Hero Modifiers**:
   - **Story Teller**: Heroes gain +1 Attack dice, +1 Movement tile per turn, and +2 bonus to Search rolls. Starting HP is 7.
   - **Tactician**: Standard unmodified baseline (7 Max HP, 3 Movement tiles, 2 Actions).
   - **Brutal Overlord**: Heroes suffer -1 Max Health (6 Max HP) and -1 Movement tile per turn (2 Movement tiles).

2. **Starting Equipment**:
   - Under the **Story Teller**, each hero begins with a basic **Sword** and an additional **Small Shield** (1 defense die).
   - Under the **Tactician** and **Brutal Overlord**, heroes begin with a standard **Sword** only.
   - Starting equipment configurations also automatically apply to newly recruited heroes and allies added during gameplay.

3. **AI Director & Dynamic Pacing**:
   - **Story Teller**: Highly merciful. Switches to **EASE** mode whenever any hero is down or party total HP is below 50%; only enters **PUSH** mode when party HP exceeds 85% and at most 1 monster remains.
   - **Tactician**: Balanced pacing. Switches to **EASE** mode if a hero is dead or party HP is below 45%; enters **PUSH** mode when party HP exceeds 80% and at most 1 monster remains.
   - **Brutal Overlord**: Relentless. Only eases off (**EASE**) if a hero is dead *and* party HP is critically low (< 25%); pushes aggressively (**PUSH**) whenever party HP is above 65% or 2 or fewer monsters remain. In addition, aggressive monster behaviors receive a passive **+25% bonus weight** (`baseWeight * 1.25`).

4. **Equipment Quirks & Archer Accuracy**:
   - Archer monsters evaluate a random chance each turn to forget their ranged weapon, forcing them into melee or advance tactics: **25%** under the Story Teller, **15%** under the Tactician, and **0%** under the Brutal Overlord (flawless archer discipline).

5. **Event & Monster Spawn Balancing**:
   - **Minimum Distance**: Newly spawned monsters from events are placed at a safe buffer distance from live heroes (4 tiles for Story Teller, 3 for Tactician, 1 for Brutal Overlord).
   - **Early-Round Delay**: Turn events spawning monsters are suppressed in early rounds (rounds 1–3 skipped for Story Teller, rounds 1–2 for Tactician, round 1 for Brutal Overlord).
   - **Troll Safeguard**: The `The Hungry Troll` spawn event is skipped if the party's total combined health is below 50% for Story Teller and Tactician.
   - **Pluggable Event Hooks**: Game Masters can also supply custom deck manipulation (`modifyEventDeck`) and event draw interceptors (`onEventDrawn`).

---

## Monster AI: Behavior Selection & Targeting

Monsters follow an intelligent tactical decision-making and target-scoring system designed to create engaging, unpredictable combat while preventing unfair focus-firing or stalemates.

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

---

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
| **Brawl** | `melee` + `melee` | Aggressive | 10 | At least one adjacent hero. |
| **Charge** | `move` + `melee` | Aggressive | 8 *(11 if target HP ≤ 50%)* | No adjacent heroes, and a hero is reachable within charge range (≤ 3 steps). |
| **Advance** | `move` + `move` | Aggressive | 6 | No adjacent heroes AND no charge path available within 3 steps. |

#### Dark Lords (`Yellow`, `Red`, `Green`, `Blue`)

| Behavior | Action Slots | Tags | Base Weight | Prerequisites / Eligibility |
| :--- | :--- | :--- | :--- | :--- |
| **Spray** | `fire_spray` + `move_or_melee` | Aggressive | 8 + 2 × *(extra heroes hit)* | At least 1 hero is currently in the special attack area / line of fire. |
| **Line up** | `move` + `fire_spray` | Aggressive | 6 | Can reach a tile within 3 steps that aligns one or more heroes in the special attack pattern. |
| **Brawl** | `melee` + `melee` | Aggressive | 5 | At least one adjacent hero. |
| **Advance** | `move` + `move` | Aggressive | 5 | No adjacent heroes, no hero in line of fire, and cannot align spray within 3 steps. |

#### Default / Fallback Behaviors

Used for custom monsters that do not register dedicated behavior sets:

| Behavior | Action Slots | Tags | Base Weight | Prerequisites / Eligibility |
| :--- | :--- | :--- | :--- | :--- |
| **Brawl** | `melee` + `melee` | Aggressive | 10 | At least one adjacent hero. |
| **Volley** | `shoot` + `shoot` | Aggressive, Ranged | 8 | Has ranged weapon, bow not forgotten, and at least one hero visible in line of sight. |
| **Advance** | `move` + `move` | Aggressive | 5 | Always eligible (fallback movement). |

---

### 3. Target Selection (Target Scoring)

When choosing which hero to attack or move towards, monsters evaluate all potential candidates using a scoring system:

- **Base Score**: Starts at `10` points.
- **Proximity Penalty**: `-3 points per step needed` to reach the target (monsters prioritize closer heroes).
- **Revenge / Aggro Bonus**: `+3 points` if the hero was the last actor to damage this monster.
- **Anti-Dogpiling (Focus-Fire Prevention)**: `-4 points` if the hero has already been targeted 2 or more times this round, encouraging monsters to distribute attacks across the party.
- **Kill Opportunity Bonus**: `+2 points` (50% notice chance) if the hero's current health is low enough to be eliminated by the monster's expected damage.
- **Tie-Breaking Variation**: `+0 to 3 points` random bonus to avoid purely deterministic targeting and break ties organically.

The hero with the highest final score is selected as the monster's target.

---

## Turn Events & Difficulty Scaling

Turn events introduce dynamic occurrences each round, including monster reinforcements, environmental changes, and blessings. Several events feature balancing rules and difficulty-scaled protections:

### Monster Spawn Events (`The Hungry Troll`, `The Lost Orc`)

- **Minimum Spawn Distance**: Spawning monsters are placed at a safe minimum distance away from any live hero:
  - **Easy**: Minimum 4 tiles away.
  - **Normal**: Minimum 3 tiles away.
  - **Hard**: Minimum 1 tile away.
- **Early Round Protection**: Monster spawn events are suppressed if drawn too early in the dungeon crawl:
  - **Easy**: Earliest in round 4 (skipped during rounds 1–3).
  - **Normal**: Earliest in round 3 (skipped during rounds 1–2).
  - **Hard**: Earliest in round 2 (skipped during round 1).
- **Party Health Safeguard**: If the hero party's combined health is below 50% of total starting HP, `The Hungry Troll` event is skipped on **Easy** and **Normal** difficulties.
- **Party Level & Visible Troll Thresholds**: `The Hungry Troll` scales its spawn limit based on the average level of the heroes:
  - **Apprentice average**: Skipped if there is already **1 or more** visible trolls in the dungeon.
  - **Knight average**: Skipped if there are already **2 or more** visible trolls in the dungeon.
  - **Hero / Lord / Master average**: Standard limit applies (skipped if **4 or more** visible trolls are present).

### Recovery Events (`Fountain of Youth`)

- **Low-Health Priority Draw**: If the party's average health is below 50%, the `Fountain of Youth` event has a **50% chance** to be the next event drawn from the deck, unless it was already played in the previous round.
