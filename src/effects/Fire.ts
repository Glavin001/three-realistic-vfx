import {
  ParticleSystem,
  RenderMode,
} from 'three.quarks';
import {
  ConeEmitter,
  SphereEmitter,
  PointEmitter,
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
import type { FireOptions } from '../core/types';
import { VFXComposite } from '../core/VFXComposite';
import type { VFXRenderer } from '../core/VFXRenderer';
import { getParticleAtlas, TileIndex, ATLAS_TILE_COUNT } from '../core/TextureAtlas';
import {
  fireGradient,
  fireStartColor,
  smokeGradient,
  smokeStartColor,
  emberGradient,
  emberStartColor,
  bellCurve,
  growCurve,
  shrinkCurve,
  decelerateCurve,
  applySoftParticles,
  resolveFlipbook,
  applyFlipbookToSystem,
} from '../core/defaults';

/**
 * Create a realistic fire effect.
 *
 * Composed of 5 sub-systems layered for depth:
 * 1. Flames (core) - Many noise-blob billboards spread in 3D via cone emitter
 * 2. Flame fill - Additional flame particles at wider spread for volume
 * 3. Inner glow - Bright additive core at the flame base
 * 4. Embers - Tiny bright dots rising, stretched billboards
 * 5. Smoke - Dark billboards rising above the flames (optional)
 *
 * Key realism: 40+ flame particles at varying depths give parallax volume.
 * Wide size/lifetime/speed variance prevents tiling artifacts.
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

  // ── Sub-system 1: Flames (core) ──
  // The workhorse — many particles spread across a cone for 3D volume
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
    prewarm: false,
    worldSpace,
    // Wide ranges create layered depth
    startLife: new IntervalValue(0.3 * heightScale, 1.0 * heightScale),
    startSpeed: new IntervalValue(1.2 * heightScale, 3.5 * heightScale),
    // Wide size range — small hot flickers mixed with large billows
    startSize: new IntervalValue(0.3 * widthScale, 1.4 * widthScale),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: fireStartColor(),
    // Higher emission for more particles creating volume
    emissionOverTime: new ConstantValue(40 * intensity),
    emissionBursts: [{
      time: 0,
      count: new ConstantValue(Math.ceil(15 * intensity)),
      cycle: 1,
      interval: 0.01,
      probability: 1,
    }],
    shape: new ConeEmitter({
      radius: widthScale * 0.7,
      angle: 0.2,
      thickness: 0.7, // Spawn throughout cone, not just surface
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
      new RotationOverLife(new IntervalValue(-0.5, 0.5)),
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

  // Apply flipbook element if configured (fire/flame category)
  const flameFlipbook = resolveFlipbook(options, 'flame') ?? resolveFlipbook(options, 'fire');
  if (flameFlipbook) {
    applyFlipbookToSystem(flames, flameFlipbook.meta, flameFlipbook.texture);
  }

  applySoftParticles(flames, options);
  composite.addSystem(flames);

  // ── Sub-system 2: Flame fill (parallax depth) ──
  // Wider-spread flame particles at different sizes to fill depth gaps
  const fillMaterial = new MeshBasicMaterial({
    map: atlas,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const flameFill = new ParticleSystem({
    duration: 1,
    looping,
    autoDestroy: !looping,
    prewarm: false,
    worldSpace,
    startLife: new IntervalValue(0.2 * heightScale, 0.7 * heightScale),
    startSpeed: new IntervalValue(1.5 * heightScale, 4.0 * heightScale),
    startSize: new IntervalValue(0.2 * widthScale, 0.8 * widthScale),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: fireStartColor(),
    emissionOverTime: new ConstantValue(20 * intensity),
    emissionBursts: [],
    shape: new SphereEmitter({
      radius: widthScale * 0.5,
      thickness: 1,
    }),
    material: fillMaterial,
    startTileIndex: new IntervalValue(TileIndex.FlameLick, TileIndex.FlameLick + 0.99),
    uTileCount: ATLAS_TILE_COUNT,
    vTileCount: ATLAS_TILE_COUNT,
    renderMode: RenderMode.BillBoard,
    renderOrder: 2,
    behaviors: [
      new SizeOverLife(bellCurve()),
      new ColorOverLife(fireGradient()),
      new RotationOverLife(new IntervalValue(-0.6, 0.6)),
      new SpeedOverLife(decelerateCurve()),
    ],
  });

  if (wind) {
    flameFill.addBehavior(
      new ForceOverLife(
        new ConstantValue(wind.x * 0.8),
        new ConstantValue(wind.y * 0.8),
        new ConstantValue(wind.z * 0.8)
      )
    );
  }

  // Use a fireball flipbook for the fill layer if available
  const fillFlipbook = resolveFlipbook(options, 'fire');
  if (fillFlipbook) {
    applyFlipbookToSystem(flameFill, fillFlipbook.meta, fillFlipbook.texture);
  }

  applySoftParticles(flameFill, options);
  composite.addSystem(flameFill);

  // ── Sub-system 3: Inner glow (bright core at base) ──
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
    prewarm: false,
    worldSpace,
    startLife: new IntervalValue(0.08, 0.25),
    startSpeed: new ConstantValue(0.5 * heightScale),
    startSize: new IntervalValue(0.6 * widthScale, 1.6 * widthScale),
    startRotation: new IntervalValue(0, Math.PI * 2),
    startColor: fireStartColor(),
    emissionOverTime: new ConstantValue(15 * intensity),
    emissionBursts: [],
    shape: new SphereEmitter({
      radius: widthScale * 0.2,
      thickness: 1,
    }),
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

  applySoftParticles(glow, options);
  composite.addSystem(glow);

  // ── Sub-system 4: Embers ──
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
      prewarm: false,
      worldSpace,
      startLife: new IntervalValue(1.0, 3.0),
      startSpeed: new IntervalValue(1.5 * heightScale, 4.5 * heightScale),
      startSize: new IntervalValue(0.015 * scale, 0.06 * scale),
      startRotation: new IntervalValue(0, Math.PI * 2),
      startColor: emberStartColor(),
      // More embers for a richer look
      emissionOverTime: new ConstantValue(15 * emberRate * intensity),
      emissionBursts: [],
      shape: new ConeEmitter({
        radius: widthScale * 0.4,
        angle: 0.5,
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
        // Upward buoyancy for floating embers
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

  // ── Sub-system 5: Smoke (above the flames) ──
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
      prewarm: false,
      worldSpace,
      startLife: new IntervalValue(2.0, 5.0),
      startSpeed: new IntervalValue(1.2 * heightScale, 2.8 * heightScale),
      startSize: new IntervalValue(0.3 * scale, 1.0 * scale),
      startRotation: new IntervalValue(0, Math.PI * 2),
      startColor: smokeStartColor('darkGray'),
      emissionOverTime: new ConstantValue(10 * smokeAmount * intensity),
      emissionBursts: [],
      shape: new ConeEmitter({
        radius: widthScale * 0.5,
        angle: 0.25,
        thickness: 0.8,
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

    // Offset smoke emitter upward — smoke comes from above the flames
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

    // Use smoke/cloud flipbook for the smoke layer
    const smokeFlipbook = resolveFlipbook(options, 'smoke') ?? resolveFlipbook(options, 'cloud');
    if (smokeFlipbook) {
      applyFlipbookToSystem(smoke, smokeFlipbook.meta, smokeFlipbook.texture);
    }

    applySoftParticles(smoke, options);
    composite.addSystem(smoke);
  }

  return composite;
}
