import {
  ParticleSystem,
  RenderMode,
} from 'three.quarks';
import {
  SphereEmitter,
  HemisphereEmitter,
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
import {
  MeshBasicMaterial,
  AdditiveBlending,
  NormalBlending,
  IcosahedronGeometry,
} from 'three';
import type { ExplosionOptions } from '../core/types';
import { VFXComposite } from '../core/VFXComposite';
import type { VFXRenderer } from '../core/VFXRenderer';
import { getParticleAtlas, TileIndex, ATLAS_TILE_COUNT } from '../core/TextureAtlas';
import {
  explosionGradient,
  emberGradient,
  smokeGradient,
  fireGradient,
  explosionSizeCurve,
  shrinkCurve,
  decelerateCurve,
  growCurve,
  bellCurve,
  applySoftParticles,
} from '../core/defaults';

// Shared geometry for mesh particles — icosahedron is a cheap lumpy sphere
const fireballMeshGeometry = new IcosahedronGeometry(0.5, 1);

/**
 * Create a realistic explosion effect.
 *
 * Composed of up to 6 sub-systems:
 * 1. Fireball core - Mesh particles (actual 3D geometry) with emissive material
 * 2. Fireball billboards - Many expanding noise-blob sprites for volume
 * 3. Shockwave - Expanding ring (optional)
 * 4. Debris - Fast outward chunks with gravity (optional)
 * 5. Sparks/embers - Bright streaks flying outward at varying depths
 * 6. Smoke column - Many dark, lingering smoke particles (optional)
 *
 * Key realism: mesh particles for the fireball core give real 3D parallax.
 * High particle counts across all layers create convincing volume.
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

  // ── Sub-system 1: Fireball core (MESH particles) ──
  // Actual 3D geometry gives free parallax — this is how AAA games do fireball cores
  const meshFireballMaterial = new MeshBasicMaterial({
    map: atlas,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const fireballCore = new ParticleSystem({
    duration,
    looping: false,
    autoDestroy: true,
    worldSpace,
    startLife: new IntervalValue(0.2, 0.6),
    startSpeed: new IntervalValue(r * 1.5, r * 4),
    startSize: new IntervalValue(r * 0.3, r * 0.8),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: explosionGradient(),
    emissionOverTime: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(Math.ceil(8 * intensity)),
        cycle: 1,
        interval: 0.01,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({
      radius: r * 0.15,
      thickness: 1,
    }),
    material: meshFireballMaterial,
    instancingGeometry: fireballMeshGeometry,
    renderMode: RenderMode.Mesh,
    renderOrder: 6,
    behaviors: [
      new SizeOverLife(explosionSizeCurve()),
      new ColorOverLife(explosionGradient()),
      new RotationOverLife(new IntervalValue(-2, 2)),
      new SpeedOverLife(decelerateCurve()),
    ],
  });

  composite.addSystem(fireballCore);

  // ── Sub-system 2: Fireball billboards (volume fill) ──
  // Many billboard particles spread across the explosion volume
  const fireballMaterial = new MeshBasicMaterial({
    map: atlas,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const fireball = new ParticleSystem({
    duration,
    looping: false,
    autoDestroy: true,
    worldSpace,
    startLife: new IntervalValue(0.25, 0.9),
    startSpeed: new IntervalValue(r * 2, r * 6),
    // Wide size range for depth layering
    startSize: new IntervalValue(r * 0.3, r * 1.5),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: explosionGradient(),
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
      radius: r * 0.25,
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
      new RotationOverLife(new IntervalValue(-1.5, 1.5)),
      new SpeedOverLife(decelerateCurve()),
    ],
  });

  applySoftParticles(fireball, options);
  composite.addSystem(fireball);

  // ── Sub-system 3: Shockwave ring ──
  if (includeShockwave) {
    const shockMaterial = new MeshBasicMaterial({
      map: atlas,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    const shockwave = new ParticleSystem({
      duration,
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
      renderMode: RenderMode.HorizontalBillBoard,
      renderOrder: 7,
      behaviors: [
        new SizeOverLife(new PiecewiseBezier([[new Bezier(0.3, 10, 15, 18), 0]])),
        new ColorOverLife(explosionGradient()),
      ],
    });

    composite.addSystem(shockwave);
  }

  // ── Sub-system 4: Debris chunks ──
  if (includeDebris) {
    const debrisMaterial = new MeshBasicMaterial({
      map: atlas,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });

    const debris = new ParticleSystem({
      duration,
      looping: false,
      autoDestroy: true,
      worldSpace,
      startLife: new IntervalValue(0.8, 2.5),
      startSpeed: new IntervalValue(r * 3, r * 10),
      startSize: new IntervalValue(0.04 * scale, 0.18 * scale),
      startRotation: new IntervalValue(0, Math.PI * 2),
      startColor: smokeGradient('darkGray'),
      emissionOverTime: new ConstantValue(0),
      emissionBursts: [
        {
          time: 0,
          count: new ConstantValue(Math.ceil(35 * intensity)),
          cycle: 1,
          interval: 0.01,
          probability: 1,
        },
      ],
      shape: new SphereEmitter({
        radius: r * 0.15,
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
        new ForceOverLife(
          new ConstantValue(0),
          new ConstantValue(-9.8 * gravity),
          new ConstantValue(0)
        ),
      ],
    });

    composite.addSystem(debris);
  }

  // ── Sub-system 5: Sparks/embers ──
  const sparkMaterial = new MeshBasicMaterial({
    map: atlas,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const sparks = new ParticleSystem({
    duration,
    looping: false,
    autoDestroy: true,
    worldSpace,
    startLife: new IntervalValue(0.4, 2.0),
    startSpeed: new IntervalValue(r * 4, r * 12),
    startSize: new IntervalValue(0.015 * scale, 0.06 * scale),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: emberGradient(),
    emissionOverTime: new ConstantValue(0),
    emissionBursts: [
      {
        time: 0,
        count: new ConstantValue(Math.ceil(45 * intensity)),
        cycle: 1,
        interval: 0.01,
        probability: 1,
      },
    ],
    shape: new SphereEmitter({
      radius: r * 0.2,
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

  // ── Sub-system 6: Smoke column ──
  // Many smoke particles spread in 3D for volumetric feel
  if (includeSmoke) {
    const smokeMaterial = new MeshBasicMaterial({
      map: atlas,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });

    const smoke = new ParticleSystem({
      duration,
      looping: false,
      autoDestroy: true,
      worldSpace,
      startLife: new IntervalValue(3.0, 7.0),
      startSpeed: new IntervalValue(r * 0.5, r * 2.0),
      // Wide size range — small wisps + large billows
      startSize: new IntervalValue(0.3 * scale, 1.5 * scale),
      startRotation: new IntervalValue(0, Math.PI * 2),
      startColor: smokeGradient('black'),
      emissionOverTime: new ConstantValue(25 * intensity),
      emissionBursts: [
        {
          time: 0,
          count: new ConstantValue(Math.ceil(15 * intensity)),
          cycle: 1,
          interval: 0.01,
          probability: 1,
        },
      ],
      // Sphere emitter for 3D spread
      shape: new SphereEmitter({
        radius: r * 0.4,
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

    applySoftParticles(smoke, options);
    composite.addSystem(smoke);
  }

  return composite;
}
