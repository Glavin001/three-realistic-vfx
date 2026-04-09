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
} from 'three.quarks';
import { MeshBasicMaterial, NormalBlending } from 'three';
import type { SmokeOptions } from '../core/types';
import { VFXComposite } from '../core/VFXComposite';
import type { VFXRenderer } from '../core/VFXRenderer';
import { getParticleAtlas, TileIndex, ATLAS_TILE_COUNT } from '../core/TextureAtlas';
import { smokeGradient, growCurve, applySoftParticles, resolveFlipbook, applyFlipbookToSystem } from '../core/defaults';

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
 *
 * Key realism technique: many particles at different depths create a volumetric
 * feel from parallax, rather than relying on a single large billboard.
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
  // Many particles spread across a sphere emitter for 3D volume
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
    prewarm: looping,
    worldSpace,
    // Wide lifetime range creates layered depth as particles at different ages
    // exist at different sizes and opacities simultaneously
    startLife: new IntervalValue(2.5 * scale, 5.0 * scale),
    startSpeed: new IntervalValue(riseSpeed * 0.4, riseSpeed * 1.2),
    // Wide size range — small puffs mix with large billows for detail at all scales
    startSize: new IntervalValue(0.4 * scale, 1.8 * scale),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: smokeGradient(colorKey),
    emissionOverTime: new ConstantValue(18 * density * intensity),
    emissionBursts: [],
    // Sphere emitter gives particles natural 3D spread from the start
    shape: new SphereEmitter({
      radius: 0.4 * scale * spread,
      thickness: 0.8, // Particles spawn throughout the sphere, not just the surface
    }),
    material: mainSmokeMaterial,
    // Randomize across all 3 cloud noise tiles for visual variety
    startTileIndex: new IntervalValue(TileIndex.CloudNoise1, TileIndex.CloudNoise3 + 0.99),
    uTileCount: ATLAS_TILE_COUNT,
    vTileCount: ATLAS_TILE_COUNT,
    renderMode: RenderMode.BillBoard,
    renderOrder: 0,
    behaviors: [
      new SizeOverLife(growCurve()),
      new ColorOverLife(smokeGradient(colorKey)),
      // Slow random rotation prevents static-looking billboards
      new RotationOverLife(new IntervalValue(-0.3, 0.3)),
      new SpeedOverLife(new PiecewiseBezier([[new Bezier(1, 0.6, 0.3, 0.1), 0]])),
    ],
  });

  // Wind
  if (wind) {
    mainSmoke.addBehavior(
      new ForceOverLife(
        new ConstantValue(wind.x),
        new ConstantValue(wind.y),
        new ConstantValue(wind.z)
      )
    );
  }

  // Buoyancy — smoke rises
  mainSmoke.addBehavior(
    new ForceOverLife(
      new ConstantValue(0),
      new ConstantValue(riseSpeed * 0.5 * gravity),
      new ConstantValue(0)
    )
  );

  // Apply flipbook element if configured (overrides procedural atlas)
  const smokeFlipbook = resolveFlipbook(options, 'smoke') ?? resolveFlipbook(options, 'cloud');
  if (smokeFlipbook) {
    applyFlipbookToSystem(mainSmoke, smokeFlipbook.meta, smokeFlipbook.texture);
  }

  applySoftParticles(mainSmoke, options);
  composite.addSystem(mainSmoke);

  // ── Sub-system 2: Secondary billows (depth fill) ──
  // Additional particles at a wider spread to fill in gaps and add parallax depth
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
    prewarm: looping,
    worldSpace,
    startLife: new IntervalValue(3.0 * scale, 5.5 * scale),
    startSpeed: new IntervalValue(riseSpeed * 0.2, riseSpeed * 0.6),
    startSize: new IntervalValue(0.6 * scale, 2.0 * scale),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: smokeGradient(colorKey),
    emissionOverTime: new ConstantValue(8 * density * intensity),
    emissionBursts: [],
    shape: new SphereEmitter({
      radius: 0.8 * scale * spread,
      thickness: 1, // Full volume
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

  // Apply a different flipbook variant for depth variety
  const fillFlipbook = resolveFlipbook(options, 'cloud') ?? resolveFlipbook(options, 'smoke');
  if (fillFlipbook) {
    applyFlipbookToSystem(fill, fillFlipbook.meta, fillFlipbook.texture);
  }

  applySoftParticles(fill, options);
  composite.addSystem(fill);

  // ── Sub-system 3: Smoke wisps ──
  // Small, lighter detail particles with more drift
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
    prewarm: looping,
    worldSpace,
    startLife: new IntervalValue(1.5 * scale, 3.5 * scale),
    startSpeed: new IntervalValue(riseSpeed * 0.3, riseSpeed * 0.8),
    startSize: new IntervalValue(0.2 * scale, 0.6 * scale),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: smokeGradient('lightGray'),
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
