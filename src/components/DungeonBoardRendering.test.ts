import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const component = readFileSync(
  join(process.cwd(), 'src/components/Dungeon.svelte'),
  'utf8',
);
const controller = readFileSync(
  join(process.cwd(), 'src/components/DungeonBoardController.ts'),
  'utf8',
);

describe('dungeon board render order', () => {
  it('stacks the dynamic actor canvas above the static dungeon canvas', () => {
    expect(component.indexOf('id="staticCanvas"')).toBeLessThan(
      component.indexOf('id="actorCanvas"'),
    );
  });

  it('draws light sprites before their glow, terrain, and actors', () => {
    const renderStart = controller.indexOf('private renderDynamicLayer =');
    const renderEnd = controller.indexOf('private scheduleDynamicFrame =');
    const renderDynamicLayer = controller.slice(renderStart, renderEnd);
    const passes = [
      'renderLightSprites(',
      'ctx.drawImage(this.lightCanvas, 0, 0)',
      'renderTerrainAnimation(',
      'renderActors(',
      'renderPillarTops(',
      'renderRoomFog(',
      'renderAmbientDarkness(',
    ].map((pass) => renderDynamicLayer.indexOf(pass));

    expect(passes.every((pass) => pass >= 0)).toBe(true);
    expect(passes).toEqual([...passes].sort((a, b) => a - b));
  });
});
