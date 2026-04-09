import {
  ParticleSystem,
  RenderMode,
  BatchedRenderer,
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
} from 'three.quarks';
import { MeshBasicMaterial, AdditiveBlending, NormalBlending, Vector3 } from 'three';
import type { SmokeOptions } from '../core/types';
import { VFXComposite } from '../core/VFXComposite';
import type { VFXRenderer } from '../core/VFXRenderer';
import { getParticleAtlas, TileIndex, ATLAS_TILE_COUNT } from '../core/TextureAtlas';
import { smokeGradient, growCurve, linearFadeCurve, constantOneCurve } from '../core/defaults';

const SMOKE_COLOR_MAP: Record<string, 'lightGray' | 'mediumGray' | 'darkGray' | 'black'> = {
  light: 'lightGray',
  dark: 'darkGray',
  black: 'black',
};

/**
 * Create a realistic smoke effect.
 *
 * Composed of 2 sub-systems:
 * 1. Main smoke billows - large, expanding, slowly rising
 * 2. Smoke wisps - smaller, lighter particles with more turbulence
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
    duration: looping ? duration : duration,
    looping,
    autoDestroy: !looping,
    prewarm: looping,
    worldSpace,
    startLife: new IntervalValue(2.0 * scale, 4.0 * scale),
    startSpeed: new IntervalValue(riseSpeed * 0.5, riseSpeed * 1.0),
    startSize: new IntervalValue(0.8 * scale, 1.5 * scale),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: smokeGradient(colorKey),
    emissionOverTime: new ConstantValue(12 * density * intensity),
    emissionBursts: [],
    shape: new ConeEmitter({
      radius: 0.3 * scale * spread,
      angle: 0.3,
      thickness: 1,
    }),
    material: mainSmokeMaterial,
    startTileIndex: new ConstantValue(TileIndex.CloudNoise1),
    uTileCount: ATLAS_TILE_COUNT,
    vTileCount: ATLAS_TILE_COUNT,
    renderMode: RenderMode.BillBoard,
    renderOrder: 0,
    behaviors: [
      new SizeOverLife(growCurve()),
      new RotationOverLife(new IntervalValue(-0.3, 0.3)),
      new SpeedOverLife(new PiecewiseBezier([[new Bezier(1, 0.6, 0.3, 0.1), 0]])),
    ],
  });

  // Apply wind force if provided
  if (wind) {
    mainSmoke.addBehavior(
      new ForceOverLife(
        new ConstantValue(wind.x),
        new ConstantValue(wind.y),
        new ConstantValue(wind.z)
      )
    );
  }

  // Apply gravity (negative upward bias for smoke)
  mainSmoke.addBehavior(
    new ForceOverLife(
      new ConstantValue(0),
      new ConstantValue(riseSpeed * 0.5 * gravity),
      new ConstantValue(0)
    )
  );

  composite.addSystem(mainSmoke);

  // ── Sub-system 2: Smoke wisps ──
  const wispMaterial = new MeshBasicMaterial({
    map: atlas,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  });

  const wisps = new ParticleSystem({
    duration: looping ? duration : duration,
    looping,
    autoDestroy: !looping,
    prewarm: looping,
    worldSpace,
    startLife: new IntervalValue(1.5 * scale, 3.0 * scale),
    startSpeed: new IntervalValue(riseSpeed * 0.3, riseSpeed * 0.7),
    startSize: new IntervalValue(0.3 * scale, 0.7 * scale),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: smokeGradient('lightGray'),
    emissionOverTime: new ConstantValue(6 * density * intensity),
    emissionBursts: [],
    shape: new ConeEmitter({
      radius: 0.5 * scale * spread,
      angle: 0.5,
      thickness: 1,
    }),
    material: wispMaterial,
    startTileIndex: new ConstantValue(TileIndex.Wisp),
    uTileCount: ATLAS_TILE_COUNT,
    vTileCount: ATLAS_TILE_COUNT,
    renderMode: RenderMode.BillBoard,
    renderOrder: -1,
    behaviors: [
      new SizeOverLife(growCurve()),
      new RotationOverLife(new IntervalValue(-0.5, 0.5)),
      new SpeedOverLife(new PiecewiseBezier([[new Bezier(1, 0.4, 0.2, 0.05), 0]])),
    ],
  });

  if (wind) {
    wisps.addBehavior(
      new ForceOverLife(
        new ConstantValue(wind.x * 1.2),
        new ConstantValue(wind.y * 1.2),
        new ConstantValue(wind.z * 1.2)
      )
    );
  }

  composite.addSystem(wisps);

  return composite;
}
