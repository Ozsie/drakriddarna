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
    const topDownStart = renderDynamicLayer.indexOf(
      '// Draw the light fixtures first',
    );
    const topDownRender = renderDynamicLayer.slice(topDownStart);
    const passes = [
      'renderLightSprites(',
      'ctx.drawImage(this.lightCanvas, 0, 0)',
      'renderTerrainAnimation(',
      'renderActors(',
      'renderPillarTops(',
      'renderRoomFog(',
      'renderAmbientDarkness(',
    ].map((pass) => topDownRender.indexOf(pass));

    expect(passes.every((pass) => pass >= 0)).toBe(true);
    expect(passes).toEqual([...passes].sort((a, b) => a - b));

    const isoRender = renderDynamicLayer.slice(
      renderDynamicLayer.indexOf("if (renderMode === 'isometric') {"),
      topDownStart,
    );
    const isoPasses = [
      'renderIsometricDungeonPrototype(',
      'drawIsoLights(',
      'ctx.drawImage(lightCanvas, 0, 0)',
      'renderAmbientDarkness(',
    ].map((pass) => isoRender.indexOf(pass));
    expect(isoPasses.every((pass) => pass >= 0)).toBe(true);
    expect(isoPasses).toEqual([...isoPasses].sort((a, b) => a - b));
  });
});
