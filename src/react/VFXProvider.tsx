import React, { createContext, useContext, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { VFXRenderer } from '../core/VFXRenderer';

const VFXContext = createContext<VFXRenderer | null>(null);

/**
 * React Three Fiber context provider that creates and manages a VFXRenderer.
 * Place this inside your <Canvas> to enable VFX effects.
 *
 * ```tsx
 * <Canvas>
 *   <VFXProvider>
 *     <FireEffect position={[0, 0, 0]} />
 *   </VFXProvider>
 * </Canvas>
 * ```
 */
export function VFXProvider({ children }: { children: React.ReactNode }) {
  const rendererRef = useRef<VFXRenderer | null>(null);
  const { scene } = useThree();

  if (!rendererRef.current) {
    rendererRef.current = new VFXRenderer();
  }

  useEffect(() => {
    const renderer = rendererRef.current!;
    scene.add(renderer);
    return () => {
      renderer.dispose();
      scene.remove(renderer);
    };
  }, [scene]);

  useFrame((_, delta) => {
    rendererRef.current?.update(delta);
  });

  return (
    <VFXContext.Provider value={rendererRef.current}>
      {children}
    </VFXContext.Provider>
  );
}

/**
 * Hook to access the VFXRenderer from context.
 * Must be used within a <VFXProvider>.
 */
export function useVFX(): VFXRenderer {
  const renderer = useContext(VFXContext);
  if (!renderer) {
    throw new Error('useVFX must be used within a <VFXProvider>');
  }
  return renderer;
}
