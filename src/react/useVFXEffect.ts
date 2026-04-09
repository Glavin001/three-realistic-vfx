import { useEffect, useRef, useCallback } from 'react';
import type { VFXComposite } from '../core/VFXComposite';
import type { VFXRenderer } from '../core/VFXRenderer';
import type { VFXEffectOptions } from '../core/types';
import { useVFX } from './VFXProvider';

interface UseVFXEffectReturn {
  /** Ref to the underlying VFXComposite (Object3D). */
  ref: React.MutableRefObject<VFXComposite | null>;
  /** Start/restart the effect. */
  play: () => void;
  /** Stop emission (particles finish naturally). */
  stop: () => void;
  /** Dispose and remove the effect. */
  dispose: () => void;
}

/**
 * Imperative hook for creating and controlling VFX effects.
 *
 * ```tsx
 * const { play, stop, ref } = useVFXEffect(createMuzzleFlash, {
 *   caliber: 'large',
 * });
 * // ref.current is the VFXComposite Object3D
 * // call play() to trigger, stop() to end emission
 * ```
 */
export function useVFXEffect<T extends VFXEffectOptions>(
  factory: (renderer: VFXRenderer, options?: T) => VFXComposite,
  options?: T,
): UseVFXEffectReturn {
  const renderer = useVFX();
  const compositeRef = useRef<VFXComposite | null>(null);

  useEffect(() => {
    const composite = factory(renderer, options);
    renderer.addEffect(composite);
    compositeRef.current = composite;

    return () => {
      composite.dispose();
      renderer.removeEffect(composite);
      compositeRef.current = null;
    };
    // Re-create when factory or options change (stringified for shallow comparison)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderer, factory, JSON.stringify(options)]);

  const play = useCallback(() => {
    compositeRef.current?.play();
  }, []);

  const stop = useCallback(() => {
    compositeRef.current?.stop();
  }, []);

  const dispose = useCallback(() => {
    if (compositeRef.current) {
      compositeRef.current.dispose();
      renderer.removeEffect(compositeRef.current);
      compositeRef.current = null;
    }
  }, [renderer]);

  return { ref: compositeRef, play, stop, dispose };
}
