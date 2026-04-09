import React, { useEffect, useRef, useState } from 'react';
import { Vector3, Texture } from 'three';
import { useVFX } from 'three-realistic-vfx/react';
import {
  createFire,
  createSmoke,
  createExplosion,
  loadFlipbooks,
  VFXComposite,
} from 'three-realistic-vfx';

interface EffectsSceneProps {
  activeEffect: 'fire' | 'smoke' | 'explosion';
  triggerKey: number;
  useFlipbooks: boolean;
}

// Flipbook element keys to load for each effect type
const FLIPBOOK_KEYS_BY_EFFECT = {
  fire: ['Flame03', 'FireBall01', 'FireBall02', 'WispySmoke01'],
  smoke: ['WispySmoke01', 'WispySmoke02', 'WispySmoke03', 'Cloud01', 'Cloud02'],
  explosion: ['Explosion01Light', 'Explosion02', 'FireBall01', 'WispySmoke01', 'Cloud01'],
};

export function EffectsScene({ activeEffect, triggerKey, useFlipbooks }: EffectsSceneProps) {
  const renderer = useVFX();
  const currentEffect = useRef<VFXComposite | null>(null);
  const [flipbookTextures, setFlipbookTextures] = useState<Map<string, Texture> | null>(null);
  const [loadingFlipbooks, setLoadingFlipbooks] = useState(false);

  // Load flipbook textures on demand
  useEffect(() => {
    if (!useFlipbooks) {
      setFlipbookTextures(null);
      return;
    }

    setLoadingFlipbooks(true);
    // Collect all unique keys needed
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
    // Don't create effect while flipbooks are still loading
    if (useFlipbooks && loadingFlipbooks) return;

    // Clean up previous effect
    if (currentEffect.current) {
      currentEffect.current.dispose();
      renderer.removeEffect(currentEffect.current);
      currentEffect.current = null;
    }

    const wind = new Vector3(0.3, 0, 0);

    // Build flipbook options if enabled
    const flipbookOpts = useFlipbooks && flipbookTextures
      ? {
          flipbook: FLIPBOOK_KEYS_BY_EFFECT[activeEffect],
          flipbookTextures,
        }
      : {};

    let effect: VFXComposite;

    switch (activeEffect) {
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

    // Debug logging
    console.log(`[VFX] Created ${activeEffect} effect with ${effect.systems.length} sub-systems`);
    for (const sys of effect.systems) {
      console.log(`  - system: paused=${sys.paused}, looping=${sys.looping}, duration=${sys.duration}, emitter.parent=${sys.emitter.parent?.name || sys.emitter.parent?.type}`);
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
