import React, { useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import { VFXProvider } from 'three-realistic-vfx/react';
import { EffectsScene } from './scenes/EffectsScene';

type EffectType = 'fire' | 'smoke' | 'explosion';

export function App() {
  const [activeEffect, setActiveEffect] = useState<EffectType>('fire');
  const [triggerKey, setTriggerKey] = useState(0);

  const triggerEffect = useCallback((type: EffectType) => {
    setActiveEffect(type);
    setTriggerKey((k) => k + 1);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 3, 8], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#1a1a2e' }}
      >
        <color attach="background" args={['#1a1a2e']} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 8, 3]} intensity={0.8} />

        <VFXProvider>
          <EffectsScene activeEffect={activeEffect} triggerKey={triggerKey} />
        </VFXProvider>

        <Grid
          position={[0, -0.01, 0]}
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#333355"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#555577"
          fadeDistance={25}
          infiniteGrid
        />

        <OrbitControls
          target={[0, 1, 0]}
          maxPolarAngle={Math.PI * 0.85}
          minDistance={3}
          maxDistance={20}
        />
      </Canvas>

      {/* UI Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 12,
          zIndex: 10,
        }}
      >
        {(['fire', 'smoke', 'explosion'] as EffectType[]).map((type) => (
          <button
            key={type}
            onClick={() => triggerEffect(type)}
            style={{
              padding: '12px 24px',
              fontSize: 16,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1,
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              color: '#fff',
              background:
                activeEffect === type
                  ? type === 'fire'
                    ? '#e65100'
                    : type === 'explosion'
                      ? '#b71c1c'
                      : '#546e7a'
                  : '#333',
              transition: 'all 0.2s',
              boxShadow:
                activeEffect === type
                  ? '0 0 20px rgba(255,100,0,0.3)'
                  : 'none',
            }}
          >
            {type === 'fire' ? '🔥 Fire' : type === 'smoke' ? '💨 Smoke' : '💥 Explosion'}
          </button>
        ))}
      </div>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          color: '#fff',
          zIndex: 10,
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          three-realistic-vfx
        </h1>
        <p style={{ fontSize: 14, opacity: 0.6, marginTop: 4 }}>
          Click an effect to trigger it. Orbit with mouse.
        </p>
      </div>
    </div>
  );
}
