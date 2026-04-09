import React, { useEffect, useRef, useMemo } from 'react';
import { Vector3 } from 'three';
import { useVFX } from 'three-realistic-vfx/react';
import { createFire, createSmoke, createExplosion } from 'three-realistic-vfx';
import type { VFXComposite } from 'three-realistic-vfx';

interface EffectsSceneProps {
  activeEffect: 'fire' | 'smoke' | 'explosion';
  triggerKey: number;
}

export function EffectsScene({ activeEffect, triggerKey }: EffectsSceneProps) {
  const renderer = useVFX();
  const currentEffect = useRef<VFXComposite | null>(null);

  useEffect(() => {
    // Clean up previous effect
    if (currentEffect.current) {
      currentEffect.current.dispose();
      renderer.removeEffect(currentEffect.current);
      currentEffect.current = null;
    }

    // Create new effect
    let effect: VFXComposite;
    const wind = new Vector3(0.3, 0, 0);

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
        });
        break;
      case 'smoke':
        effect = createSmoke(renderer, {
          scale: 1.2,
          intensity: 1,
          smokeColor: 'dark',
          density: 1,
          riseSpeed: 1.5,
          spread: 1,
          wind,
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
        });
        break;
    }

    effect.position.set(0, 0, 0);
    renderer.addEffect(effect);
    currentEffect.current = effect;

    return () => {
      if (currentEffect.current) {
        currentEffect.current.dispose();
        renderer.removeEffect(currentEffect.current);
        currentEffect.current = null;
      }
    };
  }, [activeEffect, triggerKey, renderer]);

  return null;
}
