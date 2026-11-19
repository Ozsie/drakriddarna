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
const isometricRendering = readFileSync(
  join(process.cwd(), 'src/dungeon/IsometricDungeonRendering.ts'),
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
      'const portal = this.activeState.dungeon.portal',
    );
    const topDownRender = renderDynamicLayer.slice(topDownStart);
    const passes = [
      'drawAura(',
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
      'drawIsoLights(',
      'renderIsometricFogLightDim(',
      'renderIsometricDungeonPrototype(',
      'renderAmbientDarkness(',
    ].map((pass) => isoRender.indexOf(pass));
    expect(isoPasses.every((pass) => pass >= 0)).toBe(true);
    expect(isoPasses).toEqual([...isoPasses].sort((a, b) => a - b));
    expect(isoRender).toContain(
      'const lightMaskCanvas = this.staticLightCanvas',
    );
    expect(isoRender).toContain(
      'const isometricLightMaskSignature = JSON.stringify({',
    );
    expect(isoRender).toContain('debugMode,');
    expect(isoRender).toContain('lightSig,');
    expect(isoRender).toContain('frameLights,');
    expect(isoRender).toContain('isometricGraphics:');
    expect(isoRender).toContain('discoveredRooms:');
    expect(isoRender).toContain('roomFog:');
    expect(isoRender).toContain('view: isometricView');
    expect(isoRender).toContain('maskCanvas:');
    expect(isoRender).not.toContain('state: sig,');
    expect(isoRender).toContain('const reuseIsometricLightMask =');
    expect(isoRender).toContain('!reuseIsometricLightMask');
    expect(isoRender).toContain(
      'reuseIsometricLightMask && hasIsometricLightViews',
    );
    expect(isoRender).toContain(
      '!this.darknessCanvas || !hasIsometricLightMask',
    );
    expect(isoRender).toContain('if (needsAmbientFilterFallback)');
    expect(isoRender).not.toContain('ctx.drawImage(lightCanvas, 0, 0)');
    expect(isoRender).toContain(
      'this.darknessCanvas,\n          lightMaskCanvas,',
    );
    expect(isoRender).not.toContain(
      'this.darknessCanvas,\n          lightCanvas,',
    );
    expect(isoRender).toContain(
      'this.scheduleDynamicFrame(hasActiveAnimations)',
    );
    expect(isoRender).not.toContain("this.lastAmbientSignature = ''");
    expect(isoRender).not.toContain('for (const canvas of [');
    expect(renderDynamicLayer).toContain(
      "this.lastIsometricLightMaskSignature = ''",
    );
    expect(controller).toContain(
      'this.lastIsometricLightMaskHasLights = false',
    );
  });

  it('depth-sorts carried item auras below isometric actors', () => {
    const auraPainter = isometricRendering.indexOf(
      'for (const { seed, position } of buildItemAuraViews(',
    );
    const actors = isometricRendering.indexOf(
      '...buildHeroPainters(liveActors, cellSize, view.projection.ax)',
    );

    expect(auraPainter).toBeGreaterThanOrEqual(0);
    expect(isometricRendering.slice(auraPainter, actors)).toContain(
      'drawAura(',
    );
    expect(actors).toBeGreaterThan(auraPainter);
  });

  it('uses the same enlarged aura footprint for portals and items in both projections', () => {
    expect(
      controller.match(
        /this\.cellSize \* AURA_FOOTPRINT_SCALE,\s*this\.cellSize \* AURA_FOOTPRINT_SCALE,/g,
      ),
    ).toHaveLength(2);
    expect(
      isometricRendering.match(
        /cellSize \* AURA_FOOTPRINT_SCALE \* zoom,\s*cellSize \* AURA_FOOTPRINT_SCALE \* 0\.5 \* zoom,/g,
      ),
    ).toHaveLength(2);
  });
});
