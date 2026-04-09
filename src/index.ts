// Core
export { VFXRenderer } from './core/VFXRenderer';
export { VFXComposite } from './core/VFXComposite';
export { getParticleAtlas, clearAtlasCache, TileIndex, ATLAS_TILE_COUNT } from './core/TextureAtlas';

// Effects
export { createSmoke } from './effects/Smoke';
export { createFire } from './effects/Fire';
export { createExplosion } from './effects/Explosion';

// Types
export type {
  VFXEffectOptions,
  SmokeOptions,
  FireOptions,
  ExplosionOptions,
  MuzzleFlashOptions,
  DustOptions,
  ImpactOptions,
  SparksOptions,
  RainOptions,
  SnowOptions,
  SteamOptions,
} from './core/types';

// Re-export commonly used three.quarks types for convenience
export { RenderMode } from 'three.quarks';
export { Bezier, PiecewiseBezier, ConstantValue, IntervalValue, Gradient } from 'three.quarks';
