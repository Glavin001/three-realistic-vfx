import React, { useEffect, useRef, useState } from 'react';
import { Vector3, Texture, MeshBasicMaterial, AdditiveBlending, NormalBlending } from 'three';
import { useVFX } from 'three-realistic-vfx/react';
import {
  createFire,
  createSmoke,
  createExplosion,
  loadFlipbooks,
  VFXComposite,
  VFXRenderer,
} from 'three-realistic-vfx';
import {
  ParticleSystem,
  RenderMode,
  BatchedRenderer,
  ConstantValue,
  IntervalValue,
  ConstantColor,
  Vector4 as QVector4,
  SphereEmitter,
  PointEmitter,
  SizeOverLife,
  ColorOverLife,
  Bezier,
  PiecewiseBezier,
  Gradient,
} from 'three.quarks';
import { Vector3 as QVector3 } from 'quarks.core';
import { getParticleAtlas, TileIndex, ATLAS_TILE_COUNT } from 'three-realistic-vfx';

interface EffectsSceneProps {
  activeEffect: 'fire' | 'smoke' | 'explosion' | 'test';
  triggerKey: number;
  useFlipbooks: boolean;
}

const FLIPBOOK_KEYS_BY_EFFECT = {
  fire: ['Flame03', 'FireBall01', 'FireBall02', 'WispySmoke01'],
  smoke: ['WispySmoke01', 'WispySmoke02', 'WispySmoke03', 'Cloud01', 'Cloud02'],
  explosion: ['Explosion01Light', 'Explosion02', 'FireBall01', 'WispySmoke01', 'Cloud01'],
  test: [],
};

/**
 * Bare-bones test particle system — bypasses all our abstractions.
 * If this works, the issue is in our effect factories.
 * If this doesn't work, the issue is in our renderer/scene setup.
 */
function createTestEffect(renderer: VFXRenderer): VFXComposite {
  const atlas = getParticleAtlas();
  const composite = new VFXComposite('Test');

  const material = new MeshBasicMaterial({
    map: atlas,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const system = new ParticleSystem({
    duration: 5,
    looping: true,
    worldSpace: true,
    startLife: new IntervalValue(1, 3),
    startSpeed: new ConstantValue(2),
    startSize: new IntervalValue(0.3, 0.8),
    startRotation: new ConstantValue(0),
    startColor: new ConstantColor(new QVector4(1, 1, 1, 1)),
    emissionOverTime: new ConstantValue(20),
    emissionBursts: [{
      time: 0,
      count: new ConstantValue(20),
      cycle: 1,
      interval: 0.01,
      probability: 1,
    }],
    shape: new PointEmitter(),
    material,
    startTileIndex: new ConstantValue(TileIndex.SoftCircle),
    uTileCount: ATLAS_TILE_COUNT,
    vTileCount: ATLAS_TILE_COUNT,
    renderMode: RenderMode.BillBoard,
    renderOrder: 0,
    behaviors: [
      new SizeOverLife(new PiecewiseBezier([[new Bezier(1, 1, 0.5, 0), 0]])),
    ],
  });

  composite.addSystem(system);
  return composite;
}

export function EffectsScene({ activeEffect, triggerKey, useFlipbooks }: EffectsSceneProps) {
  const renderer = useVFX();
  const currentEffect = useRef<VFXComposite | null>(null);
  const [flipbookTextures, setFlipbookTextures] = useState<Map<string, Texture> | null>(null);
  const [loadingFlipbooks, setLoadingFlipbooks] = useState(false);

  useEffect(() => {
    if (!useFlipbooks) {
      setFlipbookTextures(null);
      return;
    }

    setLoadingFlipbooks(true);
    const allKeys = [...new Set(Object.values(FLIPBOOK_KEYS_BY_EFFECT).flat())];

    loadFlipbooks(allKeys, '/flipbooks/')
      .then((textures) => {
        setFlipbookTextures(textures);
        setLoadingFlipbooks(false);
      })
      .catch((err) => {
        console.warn('Failed to load flipbooks, falling back to procedural:', err);
        setLoadingFlipbooks(false);
      });
  }, [useFlipbooks]);

  useEffect(() => {
    if (useFlipbooks && loadingFlipbooks) return;

    // Clean up previous effect
    if (currentEffect.current) {
      currentEffect.current.dispose();
      renderer.removeEffect(currentEffect.current);
      currentEffect.current = null;
    }

    const wind = new Vector3(0.3, 0, 0);

    const flipbookOpts = useFlipbooks && flipbookTextures
      ? {
          flipbook: FLIPBOOK_KEYS_BY_EFFECT[activeEffect],
          flipbookTextures,
        }
      : {};

    let effect: VFXComposite;

    switch (activeEffect) {
      case 'test':
        effect = createTestEffect(renderer);
        break;
      case 'fire':
        effect = createFire(renderer, {
          scale: 1,
          intensity: 1,
          flameHeight: 2,
          flameWidth: 0.5,
          smokeAmount: 0.6,
          emberRate: 0.4,
          wind,
          ...flipbookOpts,
        });
        break;
      case 'smoke':
        effect = createSmoke(renderer, {
          scale: 1.2,
          intensity: 1,
          smokeColor: 'light',
          density: 1,
          riseSpeed: 1.5,
          spread: 1,
          wind,
          ...flipbookOpts,
        });
        break;
      case 'explosion':
        effect = createExplosion(renderer, {
          scale: 1,
          intensity: 1.2,
          radius: 2,
          includeShockwave: true,
          includeDebris: true,
          includeSmoke: true,
          wind,
          ...flipbookOpts,
        });
        break;
    }

    effect.position.set(0, 0, 0);
    renderer.addEffect(effect);
    currentEffect.current = effect;

    console.log(`[VFX] Created ${activeEffect} with ${effect.systems.length} systems`);
    for (let i = 0; i < effect.systems.length; i++) {
      const sys = effect.systems[i];
      console.log(`  [${i}] paused=${sys.paused} looping=${sys.looping} dur=${sys.duration} renderMode=${sys.renderMode} emitter.parent=${sys.emitter.parent?.name || sys.emitter.parent?.type}`);
      // Walk the parent chain
      let p = sys.emitter as any;
      const chain: string[] = [];
      while (p) { chain.push(p.name || p.type || '?'); p = p.parent; }
      console.log(`       chain: ${chain.join(' -> ')}`);
    }

    return () => {
      if (currentEffect.current) {
        currentEffect.current.dispose();
        renderer.removeEffect(currentEffect.current);
        currentEffect.current = null;
      }
    };
  }, [activeEffect, triggerKey, renderer, useFlipbooks, flipbookTextures, loadingFlipbooks]);

  return null;
}
