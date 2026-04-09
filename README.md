# three-realistic-vfx

High quality realistic VFX for Three.js — fire, smoke, explosions, and more.

Built on [three.quarks](https://github.com/Alchemist0823/three.quarks) with support for both vanilla Three.js and React Three Fiber.

## Features

- **Realistic multi-layered effects** — each effect is composed of 2-5 particle sub-systems (flames + embers + smoke + glow)
- **Zero-asset setup** — procedural texture atlas generated at runtime, no external files needed
- **Custom texture support** — override procedural textures with your own for higher fidelity
- **Parameterizable** — control scale, intensity, wind, colors, and effect-specific options
- **TypeScript-first** — full type definitions for all APIs
- **Dual API** — factory functions for vanilla Three.js, declarative components + hooks for React Three Fiber

## Installation

```bash
npm install three-realistic-vfx three
```

## Quick Start (Three.js)

```ts
import { VFXRenderer, createFire } from 'three-realistic-vfx';
import { Scene, Vector3 } from 'three';

// 1. Create renderer and add to scene
const vfxRenderer = new VFXRenderer();
scene.add(vfxRenderer);

// 2. Create an effect
const fire = createFire(vfxRenderer, {
  flameHeight: 2,
  smokeAmount: 0.6,
  wind: new Vector3(0.3, 0, 0),
});

// 3. Add effect to renderer
vfxRenderer.addEffect(fire);
fire.position.set(0, 0, 0);

// 4. Update each frame
function animate() {
  const delta = clock.getDelta();
  vfxRenderer.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

## Quick Start (React Three Fiber)

```tsx
import { Canvas } from '@react-three/fiber';
import { VFXProvider, FireEffect } from 'three-realistic-vfx/react';

function App() {
  return (
    <Canvas>
      <VFXProvider>
        <FireEffect
          position={[0, 0, 0]}
          flameHeight={2}
          smokeAmount={0.6}
          wind={[0.3, 0, 0]}
        />
      </VFXProvider>
    </Canvas>
  );
}
```

## Available Effects

| Effect | Factory Function | R3F Component | Description |
|--------|-----------------|---------------|-------------|
| Fire | `createFire()` | `<FireEffect>` | Realistic fire with flames, inner glow, embers, and smoke |
| Smoke | `createSmoke()` | `<SmokeEffect>` | Volumetric smoke billows with wisps |
| Explosion | `createExplosion()` | `<ExplosionEffect>` | Fireball, shockwave, debris, sparks, and smoke column |

## API

### Core

- **`VFXRenderer`** — Manages the particle batch renderer. Add to your Three.js scene, call `update(delta)` each frame.
- **`VFXComposite`** — Returned by factory functions. An Object3D containing all sub-systems. Call `play()`, `stop()`, `pause()`, `resume()`, `dispose()`.

### Effect Options

All effects accept a base set of options:

```ts
interface VFXEffectOptions {
  scale?: number;       // Overall scale (default: 1)
  intensity?: number;   // Emission rate multiplier (default: 1)
  wind?: Vector3;       // Wind force
  gravity?: number;     // Gravity multiplier (default: 1)
  worldSpace?: boolean; // Emit in world space (default: true)
  texture?: Texture;    // Custom texture override
}
```

Plus effect-specific options like `flameHeight`, `smokeColor`, `radius`, etc.

### React Hooks

- **`useVFX()`** — Access the VFXRenderer from context
- **`useVFXEffect(factory, options)`** — Imperative hook returning `{ play, stop, dispose, ref }`

## Demo

```bash
cd demo
npm install
npm run dev
```

## License

MIT
