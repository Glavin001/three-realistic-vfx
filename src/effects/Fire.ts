import {
  ParticleSystem,
  RenderMode,
} from 'three.quarks';
import {
  ConeEmitter,
  PointEmitter,
  ConstantValue,
  IntervalValue,
  SizeOverLife,
  ColorOverLife,
  RotationOverLife,
  ForceOverLife,
  SpeedOverLife,
  FrameOverLife,
  Bezier,
  PiecewiseBezier,
} from 'three.quarks';
import { MeshBasicMaterial, AdditiveBlending, NormalBlending } from 'three';
import type { FireOptions } from '../core/types';
import { VFXComposite } from '../core/VFXComposite';
import type { VFXRenderer } from '../core/VFXRenderer';
import { getParticleAtlas, TileIndex, ATLAS_TILE_COUNT } from '../core/TextureAtlas';
import {
  fireGradient,
  smokeGradient,
  emberGradient,
  bellCurve,
  growCurve,
  shrinkCurve,
  decelerateCurve,
} from '../core/defaults';

/**
 * Create a realistic fire effect.
 *
 * Composed of 4 sub-systems:
 * 1. Flames - Core fire with noise-blob textures, additive blending, color gradient
 * 2. Inner glow - Bright additive core at the flame base
 * 3. Embers - Tiny bright dots rising, stretched billboards
 * 4. Smoke - Dark billboards rising above the flames (optional)
 */
export function createFire(renderer: VFXRenderer, options: FireOptions = {}): VFXComposite {
  const {
    scale = 1,
    intensity = 1,
    wind,
    gravity = 1,
    worldSpace = true,
    texture,
    flameHeight = 2,
    flameWidth = 0.5,
    smokeAmount = 0.5,
    emberRate = 0.3,
    includeSmoke = true,
    looping = true,
  } = options;

  const atlas = texture ?? getParticleAtlas();
  const composite = new VFXComposite('Fire');
  const heightScale = flameHeight * scale;
  const widthScale = flameWidth * scale;

  // ── Sub-system 1: Flames (core fire) ──
  const flameMaterial = new MeshBasicMaterial({
    map: atlas,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const flames = new ParticleSystem({
    duration: 1,
    looping,
    autoDestroy: !looping,
    prewarm: looping,
    worldSpace,
    startLife: new IntervalValue(0.4 * heightScale, 0.9 * heightScale),
    startSpeed: new IntervalValue(1.5 * heightScale, 3.0 * heightScale),
    startSize: new IntervalValue(0.5 * widthScale, 1.2 * widthScale),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: fireGradient(),
    emissionOverTime: new ConstantValue(30 * intensity),
    emissionBursts: [],
    shape: new ConeEmitter({
      radius: widthScale * 0.6,
      angle: 0.15,
      thickness: 0.5,
    }),
    material: flameMaterial,
    startTileIndex: new IntervalValue(TileIndex.NoiseBlob1, TileIndex.NoiseBlob3 + 0.99),
    uTileCount: ATLAS_TILE_COUNT,
    vTileCount: ATLAS_TILE_COUNT,
    renderMode: RenderMode.BillBoard,
    renderOrder: 2,
    behaviors: [
      new SizeOverLife(bellCurve()),
      new ColorOverLife(fireGradient()),
      new RotationOverLife(new IntervalValue(-0.4, 0.4)),
      new SpeedOverLife(decelerateCurve()),
    ],
  });

  if (wind) {
    flames.addBehavior(
      new ForceOverLife(
        new ConstantValue(wind.x),
        new ConstantValue(wind.y),
        new ConstantValue(wind.z)
      )
    );
  }

  composite.addSystem(flames);

  // ── Sub-system 2: Inner glow (bright core at base) ──
  const glowMaterial = new MeshBasicMaterial({
    map: atlas,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const glow = new ParticleSystem({
    duration: 1,
    looping,
    autoDestroy: !looping,
    prewarm: looping,
    worldSpace,
    startLife: new IntervalValue(0.1, 0.3),
    startSpeed: new ConstantValue(0.5 * heightScale),
    startSize: new IntervalValue(0.8 * widthScale, 1.5 * widthScale),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: fireGradient(),
    emissionOverTime: new ConstantValue(15 * intensity),
    emissionBursts: [],
    shape: new PointEmitter(),
    material: glowMaterial,
    startTileIndex: new ConstantValue(TileIndex.SoftCircle),
    uTileCount: ATLAS_TILE_COUNT,
    vTileCount: ATLAS_TILE_COUNT,
    renderMode: RenderMode.BillBoard,
    renderOrder: 3,
    behaviors: [
      new SizeOverLife(new PiecewiseBezier([[new Bezier(0.5, 1, 1, 0), 0]])),
      new ColorOverLife(fireGradient()),
    ],
  });

  composite.addSystem(glow);

  // ── Sub-system 3: Embers ──
  if (emberRate > 0) {
    const emberMaterial = new MeshBasicMaterial({
      map: atlas,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    const embers = new ParticleSystem({
      duration: 1,
      looping,
      autoDestroy: !looping,
      prewarm: looping,
      worldSpace,
      startLife: new IntervalValue(1.0, 2.5),
      startSpeed: new IntervalValue(2.0 * heightScale, 4.0 * heightScale),
      startSize: new IntervalValue(0.02 * scale, 0.06 * scale),
      startRotation: new IntervalValue(0, Math.PI * 2),
      startColor: emberGradient(),
      emissionOverTime: new ConstantValue(10 * emberRate * intensity),
      emissionBursts: [],
      shape: new ConeEmitter({
        radius: widthScale * 0.3,
        angle: 0.4,
        thickness: 1,
      }),
      material: emberMaterial,
      startTileIndex: new ConstantValue(TileIndex.BrightDot),
      uTileCount: ATLAS_TILE_COUNT,
      vTileCount: ATLAS_TILE_COUNT,
      renderMode: RenderMode.StretchedBillBoard,
      rendererEmitterSettings: { speedFactor: 0.1 },
      renderOrder: 4,
      behaviors: [
        new SizeOverLife(shrinkCurve()),
        new ColorOverLife(emberGradient()),
        new SpeedOverLife(decelerateCurve()),
        // Slight upward bias to counteract gravity for floating embers
        new ForceOverLife(
          new ConstantValue(0),
          new ConstantValue(1.5 * gravity),
          new ConstantValue(0)
        ),
      ],
    });

    if (wind) {
      embers.addBehavior(
        new ForceOverLife(
          new ConstantValue(wind.x * 0.5),
          new ConstantValue(wind.y * 0.5),
          new ConstantValue(wind.z * 0.5)
        )
      );
    }

    composite.addSystem(embers);
  }

  // ── Sub-system 4: Smoke (above the flames) ──
  if (includeSmoke && smokeAmount > 0) {
    const smokeMaterial = new MeshBasicMaterial({
      map: atlas,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });

    const smoke = new ParticleSystem({
      duration: 1,
      looping,
      autoDestroy: !looping,
      prewarm: looping,
      worldSpace,
      startLife: new IntervalValue(2.0, 4.0),
      startSpeed: new IntervalValue(1.5 * heightScale, 2.5 * heightScale),
      startSize: new IntervalValue(0.4 * scale, 0.8 * scale),
      startRotation: new IntervalValue(0, Math.PI * 2),
      startColor: smokeGradient('darkGray'),
      emissionOverTime: new ConstantValue(8 * smokeAmount * intensity),
      emissionBursts: [],
      shape: new ConeEmitter({
        radius: widthScale * 0.4,
        angle: 0.2,
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
        new ColorOverLife(smokeGradient('darkGray')),
        new RotationOverLife(new IntervalValue(-0.2, 0.2)),
        new SpeedOverLife(decelerateCurve()),
        new ForceOverLife(
          new ConstantValue(0),
          new ConstantValue(1.0 * gravity),
          new ConstantValue(0)
        ),
      ],
    });

    // Offset smoke emitter slightly upward
    smoke.emitter.position.y = heightScale * 0.5;

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
