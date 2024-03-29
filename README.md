# Drakriddarna

[Board Game Geek](https://boardgamegeek.com/image/4326455/dragonfire)

[Rules inconsistencies](https://boardgamegeek.com/thread/2896557/rules-omissions-ambiguities-and-oddities)

## Todo
- [ ] Difficulty levels
- [ ] Dungeon intro screen
- [ ] Create function for random item on floor
- [ ] Stop search through walls & doors
- [ ] Corners
  - [X] e1m0
  - [ ] e1m1
  - [ ] e1m2
  - [ ] e1m3
  - [ ] e1m4
- [ ] e1m5 - The Ice Dragons Treasure
- [ ] e1m6 - The Final Battle
- [ ] Green dark lord paralyzing sword
- [ ] Select door on click when multiple doors in same cell
- [ ] Multiple saves
- [ ] Graphics
- [ ] Diary on mobile
- [ ] Responsive layout
- [ ] Support for additional campaigns
- [ ] Magic Item/Weapon: Sword of Chaos
- [ ] Event #16 - The Hexagram
- [ ] Doors blocking monsters?
- [ ] Trade Items?
- [ ] Monster cards?
- [ ] Level editor
- [X] e1m4 - The Dark Citadel
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
