import {
  ParticleSystem,
  RenderMode,
} from 'three.quarks';
import {
  SphereEmitter,
  PointEmitter,
  ConeEmitter,
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
import { MeshBasicMaterial, AdditiveBlending, NormalBlending } from 'three';
import type { ExplosionOptions } from '../core/types';
import { VFXComposite } from '../core/VFXComposite';
import type { VFXRenderer } from '../core/VFXRenderer';
import { getParticleAtlas, TileIndex, ATLAS_TILE_COUNT } from '../core/TextureAtlas';
import {
  explosionGradient,
  emberGradient,
  smokeGradient,
  explosionSizeCurve,
  shrinkCurve,
  decelerateCurve,
  growCurve,
} from '../core/defaults';

/**
 * Create a realistic explosion effect.
 *
 * Composed of up to 5 sub-systems:
 * 1. Fireball - Burst of bright, expanding particles
 * 2. Shockwave - Expanding ring (optional)
 * 3. Debris - Fast outward chunks with gravity (optional)
 * 4. Sparks/embers - Bright streaks flying outward
 * 5. Smoke column - Dark, lingering smoke cloud (optional)
 */
export function createExplosion(renderer: VFXRenderer, options: ExplosionOptions = {}): VFXComposite {
  const {
    scale = 1,
    intensity = 1,
    wind,
    gravity = 1,
    worldSpace = true,
    texture,
    radius = 2,
    includeShockwave = true,
    includeDebris = true,
    includeSmoke = true,
    duration = 3,
  } = options;

  const atlas = texture ?? getParticleAtlas();
  const composite = new VFXComposite('Explosion');
  const r = radius * scale;

  // ── Sub-system 1: Fireball ──
  const fireballMaterial = new MeshBasicMaterial({
    map: atlas,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const fireball = new ParticleSystem({
    duration: duration,
    looping: false,
    autoDestroy: true,
    worldSpace,
    startLife: new IntervalValue(0.3, 0.8),
    startSpeed: new IntervalValue(r * 2, r * 5),
    startSize: new IntervalValue(r * 0.5, r * 1.2),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: explosionGradient(),
    emissionOverTime: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(Math.ceil(15 * intensity)),
        cycle: 1,
        interval: 0.01,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({
      radius: r * 0.2,
      thickness: 1,
    }),
    material: fireballMaterial,
    startTileIndex: new IntervalValue(TileIndex.NoiseBlob1, TileIndex.NoiseBlob3 + 0.99),
    uTileCount: ATLAS_TILE_COUNT,
    vTileCount: ATLAS_TILE_COUNT,
    renderMode: RenderMode.BillBoard,
    renderOrder: 5,
    behaviors: [
      new SizeOverLife(explosionSizeCurve()),
      new ColorOverLife(explosionGradient()),
      new RotationOverLife(new IntervalValue(-1, 1)),
      new SpeedOverLife(decelerateCurve()),
    ],
  });

  composite.addSystem(fireball);

  // ── Sub-system 2: Shockwave ring ──
  if (includeShockwave) {
    const shockMaterial = new MeshBasicMaterial({
      map: atlas,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    const shockwave = new ParticleSystem({
      duration: duration,
      looping: false,
      autoDestroy: true,
      worldSpace,
      startLife: new ConstantValue(0.3),
      startSpeed: new ConstantValue(0),
      startSize: new ConstantValue(r * 0.3),
      startRotation: new ConstantValue(0),
      startColor: explosionGradient(),
      emissionOverTime: new ConstantValue(0),
      emissionBursts: [
        {
          time: 0,
          count: new ConstantValue(1),
          cycle: 1,
          interval: 0.01,
          probability: 1,
        },
      ],
      shape: new PointEmitter(),
      material: shockMaterial,
      startTileIndex: new ConstantValue(TileIndex.Ring),
      uTileCount: ATLAS_TILE_COUNT,
      vTileCount: ATLAS_TILE_COUNT,
      renderMode: RenderMode.BillBoard,
      renderOrder: 6,
      behaviors: [
        // Rapidly expand the ring
        new SizeOverLife(new PiecewiseBezier([[new Bezier(0.3, 8, 12, 15), 0]])),
        new ColorOverLife(explosionGradient()),
      ],
    });

    composite.addSystem(shockwave);
  }

  // ── Sub-system 3: Debris chunks ──
  if (includeDebris) {
    const debrisMaterial = new MeshBasicMaterial({
      map: atlas,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });

    const debris = new ParticleSystem({
      duration: duration,
      looping: false,
      autoDestroy: true,
      worldSpace,
      startLife: new IntervalValue(0.8, 2.0),
      startSpeed: new IntervalValue(r * 3, r * 8),
      startSize: new IntervalValue(0.05 * scale, 0.15 * scale),
      startRotation: new IntervalValue(0, Math.PI * 2),
      startColor: smokeGradient('darkGray'),
      emissionOverTime: new ConstantValue(0),
      emissionBursts: [
        {
          time: 0,
          count: new ConstantValue(Math.ceil(25 * intensity)),
          cycle: 1,
          interval: 0.01,
          probability: 1,
        },
      ],
      shape: new SphereEmitter({
        radius: r * 0.1,
        thickness: 1,
      }),
      material: debrisMaterial,
      startTileIndex: new ConstantValue(TileIndex.Debris),
      uTileCount: ATLAS_TILE_COUNT,
      vTileCount: ATLAS_TILE_COUNT,
      renderMode: RenderMode.StretchedBillBoard,
      rendererEmitterSettings: { speedFactor: 0.05 },
      renderOrder: 3,
      behaviors: [
        new RotationOverLife(new IntervalValue(-3, 3)),
        new SpeedOverLife(decelerateCurve()),
        // Strong gravity pulls debris down
        new ForceOverLife(
          new ConstantValue(0),
          new ConstantValue(-9.8 * gravity),
          new ConstantValue(0)
        ),
      ],
    });

    composite.addSystem(debris);
  }

  // ── Sub-system 4: Sparks/embers ──
  const sparkMaterial = new MeshBasicMaterial({
    map: atlas,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const sparks = new ParticleSystem({
    duration: duration,
    looping: false,
    autoDestroy: true,
    worldSpace,
    startLife: new IntervalValue(0.5, 1.5),
    startSpeed: new IntervalValue(r * 4, r * 10),
    startSize: new IntervalValue(0.02 * scale, 0.05 * scale),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: emberGradient(),
    emissionOverTime: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(Math.ceil(30 * intensity)),
        cycle: 1,
        interval: 0.01,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({
      radius: r * 0.15,
      thickness: 1,
    }),
    material: sparkMaterial,
    startTileIndex: new ConstantValue(TileIndex.BrightDot),
    uTileCount: ATLAS_TILE_COUNT,
    vTileCount: ATLAS_TILE_COUNT,
    renderMode: RenderMode.StretchedBillBoard,
    rendererEmitterSettings: { speedFactor: 0.08 },
    renderOrder: 4,
    behaviors: [
      new SizeOverLife(shrinkCurve()),
      new ColorOverLife(emberGradient()),
      new SpeedOverLife(decelerateCurve()),
      new ForceOverLife(
        new ConstantValue(0),
        new ConstantValue(-5 * gravity),
        new ConstantValue(0)
      ),
    ],
  });

  if (wind) {
    sparks.addBehavior(
      new ForceOverLife(
        new ConstantValue(wind.x * 0.3),
        new ConstantValue(wind.y * 0.3),
        new ConstantValue(wind.z * 0.3)
      )
    );
  }

  composite.addSystem(sparks);

  // ── Sub-system 5: Smoke column ──
  if (includeSmoke) {
    const smokeMaterial = new MeshBasicMaterial({
      map: atlas,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });

    const smoke = new ParticleSystem({
      duration: duration,
      looping: false,
      autoDestroy: true,
      worldSpace,
      startLife: new IntervalValue(3.0, 6.0),
      startSpeed: new IntervalValue(r * 0.5, r * 1.5),
      startSize: new IntervalValue(0.5 * scale, 1.0 * scale),
      startRotation: new IntervalValue(0, Math.PI * 2),
      startColor: smokeGradient('black'),
      // Emit smoke for 0.5s after explosion then stop
      emissionOverTime: new ConstantValue(20 * intensity),
      emissionBursts: [
        {
          time: 0,
          count: new ConstantValue(Math.ceil(10 * intensity)),
          cycle: 1,
          interval: 0.01,
          probability: 1,
        },
      ],
      shape: new SphereEmitter({
        radius: r * 0.3,
        thickness: 1,
      }),
      material: smokeMaterial,
      startTileIndex: new IntervalValue(TileIndex.CloudNoise1, TileIndex.CloudNoise3 + 0.99),
      uTileCount: ATLAS_TILE_COUNT,
      vTileCount: ATLAS_TILE_COUNT,
      renderMode: RenderMode.BillBoard,
      renderOrder: 1,
      behaviors: [
        new SizeOverLife(growCurve()),
        new ColorOverLife(smokeGradient('black')),
        new RotationOverLife(new IntervalValue(-0.3, 0.3)),
        new SpeedOverLife(decelerateCurve()),
        // Smoke rises
        new ForceOverLife(
          new ConstantValue(0),
          new ConstantValue(2.0 * gravity),
          new ConstantValue(0)
        ),
      ],
    });

    if (wind) {
      smoke.addBehavior(
        new ForceOverLife(
          new ConstantValue(wind.x),
          new ConstantValue(wind.y),
          new ConstantValue(wind.z)
        )
      );
    }

    composite.addSystem(smoke);
  }

  return composite;
}
