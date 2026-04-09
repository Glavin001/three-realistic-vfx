import {
  ParticleSystem,
  RenderMode,
} from 'three.quarks';
import {
  ConeEmitter,
  SphereEmitter,
  ConstantValue,
  IntervalValue,
  SizeOverLife,
  ColorOverLife,
  RotationOverLife,
  ForceOverLife,
  SpeedOverLife,
  Bezier,
  PiecewiseBezier,
  ConstantColor,
  Vector4 as QVector4,
} from 'three.quarks';
import { MeshBasicMaterial, NormalBlending } from 'three';
import type { SmokeOptions } from '../core/types';
import { VFXComposite } from '../core/VFXComposite';
import type { VFXRenderer } from '../core/VFXRenderer';
import { getParticleAtlas, TileIndex, ATLAS_TILE_COUNT } from '../core/TextureAtlas';
import { smokeGradient, smokeStartColor, growCurve, applySoftParticles, resolveFlipbook, applyFlipbookToSystem } from '../core/defaults';

const SMOKE_COLOR_MAP: Record<string, 'lightGray' | 'mediumGray' | 'darkGray' | 'black'> = {
  light: 'lightGray',
  dark: 'darkGray',
  black: 'black',
};

/**
 * Create a realistic smoke effect.
 *
 * Composed of 3 sub-systems spread in 3D space:
 * 1. Main smoke billows - large, expanding, slowly rising cloud noise billboards
 * 2. Secondary billows - offset particles at varying depths for parallax volume
 * 3. Smoke wisps - smaller, lighter particles with more drift
 */
export function createSmoke(renderer: VFXRenderer, options: SmokeOptions = {}): VFXComposite {
  const {
    scale = 1,
    intensity = 1,
    wind,
    gravity = 1,
    worldSpace = true,
    texture,
    smokeColor = 'dark',
    density = 1,
    riseSpeed = 1.5,
    spread = 1,
    looping = true,
    duration = 5,
  } = options;

  const atlas = texture ?? getParticleAtlas();
  const composite = new VFXComposite('Smoke');

  // Resolve color key
  let colorKey: 'lightGray' | 'mediumGray' | 'darkGray' | 'black' = 'darkGray';
  if (typeof smokeColor === 'string' && smokeColor in SMOKE_COLOR_MAP) {
    colorKey = SMOKE_COLOR_MAP[smokeColor];
  }

  // ── Sub-system 1: Main smoke billows ──
  const mainSmokeMaterial = new MeshBasicMaterial({
    map: atlas,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });

  const mainSmoke = new ParticleSystem({
    duration,
    looping,
    autoDestroy: !looping,
    worldSpace,
    startLife: new IntervalValue(2.5 * scale, 5.0 * scale),
    startSpeed: new IntervalValue(riseSpeed * 0.4, riseSpeed * 1.2),
    startSize: new IntervalValue(0.4 * scale, 1.8 * scale),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: smokeStartColor(colorKey),
    emissionOverTime: new ConstantValue(18 * density * intensity),
    emissionBursts: [{
      time: 0,
      count: new ConstantValue(10),
      cycle: 1,
      interval: 0.01,
      probability: 1,
    }],
    shape: new SphereEmitter({
      radius: 0.4 * scale * spread,
      thickness: 0.8,
    }),
    material: mainSmokeMaterial,
    startTileIndex: new IntervalValue(TileIndex.CloudNoise1, TileIndex.CloudNoise3 + 0.99),
    uTileCount: ATLAS_TILE_COUNT,
    vTileCount: ATLAS_TILE_COUNT,
    renderMode: RenderMode.BillBoard,
    renderOrder: 0,
    behaviors: [
      new SizeOverLife(growCurve()),
      new ColorOverLife(smokeGradient(colorKey)),
      new RotationOverLife(new IntervalValue(-0.3, 0.3)),
      new SpeedOverLife(new PiecewiseBezier([[new Bezier(1, 0.6, 0.3, 0.1), 0]])),
    ],
  });

  if (wind) {
    mainSmoke.addBehavior(
      new ForceOverLife(
        new ConstantValue(wind.x),
        new ConstantValue(wind.y),
        new ConstantValue(wind.z)
      )
    );
  }

  mainSmoke.addBehavior(
    new ForceOverLife(
      new ConstantValue(0),
      new ConstantValue(riseSpeed * 0.5 * gravity),
      new ConstantValue(0)
    )
  );

  const smokeFlipbook = resolveFlipbook(options, 'smoke') ?? resolveFlipbook(options, 'cloud');
  if (smokeFlipbook) {
    applyFlipbookToSystem(mainSmoke, smokeFlipbook.meta, smokeFlipbook.texture);
  }

  applySoftParticles(mainSmoke, options);
  composite.addSystem(mainSmoke);

  // ── Sub-system 2: Secondary billows (depth fill) ──
  const fillMaterial = new MeshBasicMaterial({
    map: atlas,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });

  const fill = new ParticleSystem({
    duration,
    looping,
    autoDestroy: !looping,
    worldSpace,
    startLife: new IntervalValue(3.0 * scale, 5.5 * scale),
    startSpeed: new IntervalValue(riseSpeed * 0.2, riseSpeed * 0.6),
    startSize: new IntervalValue(0.6 * scale, 2.0 * scale),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: smokeStartColor(colorKey),
    emissionOverTime: new ConstantValue(8 * density * intensity),
    emissionBursts: [],
    shape: new SphereEmitter({
      radius: 0.8 * scale * spread,
      thickness: 1,
    }),
    material: fillMaterial,
    startTileIndex: new IntervalValue(TileIndex.CloudNoise1, TileIndex.CloudNoise3 + 0.99),
    uTileCount: ATLAS_TILE_COUNT,
    vTileCount: ATLAS_TILE_COUNT,
    renderMode: RenderMode.BillBoard,
    renderOrder: -1,
    behaviors: [
      new SizeOverLife(growCurve()),
      new ColorOverLife(smokeGradient(colorKey)),
      new RotationOverLife(new IntervalValue(-0.2, 0.2)),
      new SpeedOverLife(new PiecewiseBezier([[new Bezier(1, 0.5, 0.2, 0.05), 0]])),
    ],
  });

  if (wind) {
    fill.addBehavior(
      new ForceOverLife(
        new ConstantValue(wind.x * 0.8),
        new ConstantValue(wind.y * 0.8),
        new ConstantValue(wind.z * 0.8)
      )
    );
  }

  fill.addBehavior(
    new ForceOverLife(
      new ConstantValue(0),
      new ConstantValue(riseSpeed * 0.3 * gravity),
      new ConstantValue(0)
    )
  );

  const fillFlipbook = resolveFlipbook(options, 'cloud') ?? resolveFlipbook(options, 'smoke');
  if (fillFlipbook) {
    applyFlipbookToSystem(fill, fillFlipbook.meta, fillFlipbook.texture);
  }

  applySoftParticles(fill, options);
  composite.addSystem(fill);

  // ── Sub-system 3: Smoke wisps ──
  const wispMaterial = new MeshBasicMaterial({
    map: atlas,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });

  const wisps = new ParticleSystem({
    duration,
    looping,
    autoDestroy: !looping,
    worldSpace,
    startLife: new IntervalValue(1.5 * scale, 3.5 * scale),
    startSpeed: new IntervalValue(riseSpeed * 0.3, riseSpeed * 0.8),
    startSize: new IntervalValue(0.2 * scale, 0.6 * scale),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: smokeStartColor('lightGray'),
    emissionOverTime: new ConstantValue(8 * density * intensity),
    emissionBursts: [],
    shape: new ConeEmitter({
      radius: 0.6 * scale * spread,
      angle: 0.6,
      thickness: 1,
    }),
    material: wispMaterial,
    startTileIndex: new ConstantValue(TileIndex.Wisp),
    uTileCount: ATLAS_TILE_COUNT,
    vTileCount: ATLAS_TILE_COUNT,
    renderMode: RenderMode.BillBoard,
    renderOrder: -2,
    behaviors: [
      new SizeOverLife(growCurve()),
      new ColorOverLife(smokeGradient('lightGray')),
      new RotationOverLife(new IntervalValue(-0.5, 0.5)),
      new SpeedOverLife(new PiecewiseBezier([[new Bezier(1, 0.4, 0.2, 0.05), 0]])),
    ],
  });

  if (wind) {
    wisps.addBehavior(
      new ForceOverLife(
        new ConstantValue(wind.x * 1.3),
        new ConstantValue(wind.y * 1.3),
        new ConstantValue(wind.z * 1.3)
      )
    );
  }

  applySoftParticles(wisps, options);
  composite.addSystem(wisps);

  return composite;
}
