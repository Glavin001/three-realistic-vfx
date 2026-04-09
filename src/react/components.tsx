import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Vector3 } from 'three';
import type { VFXComposite } from '../core/VFXComposite';
import type { FireOptions, SmokeOptions, ExplosionOptions } from '../core/types';
import { createFire } from '../effects/Fire';
import { createSmoke } from '../effects/Smoke';
import { createExplosion } from '../effects/Explosion';
import { useVFX } from './VFXProvider';

// ── Shared helpers ──

type Tuple3 = [number, number, number];

interface EffectBaseProps {
  position?: Tuple3;
  rotation?: Tuple3;
  /** If true, effect plays on mount (default: true) */
  autoPlay?: boolean;
  /** Called when a non-looping effect finishes */
  onComplete?: () => void;
}

function useEffectLifecycle(
  factoryFn: () => VFXComposite,
  position?: Tuple3,
  rotation?: Tuple3,
  autoPlay = true,
): React.MutableRefObject<VFXComposite | null> {
  const renderer = useVFX();
  const compositeRef = useRef<VFXComposite | null>(null);

  useEffect(() => {
    const composite = factoryFn();
    renderer.addEffect(composite);
    compositeRef.current = composite;

    if (position) {
      composite.position.set(...position);
    }
    if (rotation) {
      composite.rotation.set(...rotation);
    }

    if (!autoPlay) {
      composite.pause();
    }

    return () => {
      composite.dispose();
      renderer.removeEffect(composite);
      compositeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderer]);

  // Update position/rotation when props change
  useEffect(() => {
    if (compositeRef.current && position) {
      compositeRef.current.position.set(...position);
    }
  }, [position?.[0], position?.[1], position?.[2]]);

  useEffect(() => {
    if (compositeRef.current && rotation) {
      compositeRef.current.rotation.set(...rotation);
    }
  }, [rotation?.[0], rotation?.[1], rotation?.[2]]);

  return compositeRef;
}

// ── Fire Component ──

export interface FireEffectProps extends EffectBaseProps, Omit<FireOptions, 'wind'> {
  wind?: Tuple3;
}

export const FireEffect = forwardRef<VFXComposite | null, FireEffectProps>(
  function FireEffect(props, ref) {
    const { position, rotation, autoPlay = true, onComplete, wind, ...options } = props;
    const renderer = useVFX();

    const compositeRef = useEffectLifecycle(
      () => createFire(renderer, {
        ...options,
        wind: wind ? new Vector3(...wind) : undefined,
      }),
      position,
      rotation,
      autoPlay,
    );

    useImperativeHandle(ref, () => compositeRef.current!, []);

    return null;
  },
);

// ── Smoke Component ──

export interface SmokeEffectProps extends EffectBaseProps, Omit<SmokeOptions, 'wind'> {
  wind?: Tuple3;
}

export const SmokeEffect = forwardRef<VFXComposite | null, SmokeEffectProps>(
  function SmokeEffect(props, ref) {
    const { position, rotation, autoPlay = true, onComplete, wind, ...options } = props;
    const renderer = useVFX();

    const compositeRef = useEffectLifecycle(
      () => createSmoke(renderer, {
        ...options,
        wind: wind ? new Vector3(...wind) : undefined,
      }),
      position,
      rotation,
      autoPlay,
    );

    useImperativeHandle(ref, () => compositeRef.current!, []);

    return null;
  },
);

// ── Explosion Component ──

export interface ExplosionEffectProps extends EffectBaseProps, Omit<ExplosionOptions, 'wind'> {
  wind?: Tuple3;
}

export const ExplosionEffect = forwardRef<VFXComposite | null, ExplosionEffectProps>(
  function ExplosionEffect(props, ref) {
    const { position, rotation, autoPlay = true, onComplete, wind, ...options } = props;
    const renderer = useVFX();

    const compositeRef = useEffectLifecycle(
      () => createExplosion(renderer, {
        ...options,
        wind: wind ? new Vector3(...wind) : undefined,
      }),
      position,
      rotation,
      autoPlay,
    );

    useImperativeHandle(ref, () => compositeRef.current!, []);

    return null;
  },
);
