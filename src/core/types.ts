import { Vector3 } from 'three';
import type { Texture } from 'three';

/**
 * Base options shared by all VFX effects.
 */
export interface VFXEffectOptions {
  /** Overall scale multiplier (default: 1) */
  scale?: number;
  /** Emission rate / particle count multiplier (default: 1) */
  intensity?: number;
  /** Wind force direction and magnitude */
  wind?: Vector3;
  /** Gravity multiplier (default: 1) */
  gravity?: number;
  /** Emit particles in world space (default: true) */
  worldSpace?: boolean;
  /** Custom texture to override procedural defaults */
  texture?: Texture;
}

export interface SmokeOptions extends VFXEffectOptions {
  /** Smoke color preset or custom hex color */
  smokeColor?: 'light' | 'dark' | 'black' | number;
  /** Emission density multiplier */
  density?: number;
  /** Upward velocity (default: 1.5) */
  riseSpeed?: number;
  /** Horizontal spread factor (default: 1) */
  spread?: number;
  /** Looping emission (default: true) */
  looping?: boolean;
  /** Duration in seconds before emission stops (default: Infinity for looping) */
  duration?: number;
}

export interface FireOptions extends VFXEffectOptions {
  /** Height of the flame column (default: 2) */
  flameHeight?: number;
  /** Base width of the fire (default: 0.5) */
  flameWidth?: number;
  /** Smoke density factor (0-1, default: 0.5) */
  smokeAmount?: number;
  /** Ember emission rate factor (0-1, default: 0.3) */
  emberRate?: number;
  /** Whether to include smoke sub-system (default: true) */
  includeSmoke?: boolean;
  /** Looping (default: true) */
  looping?: boolean;
}

export interface ExplosionOptions extends VFXEffectOptions {
  /** Explosion radius (default: 2) */
  radius?: number;
  /** Include shockwave ring (default: true) */
  includeShockwave?: boolean;
  /** Include debris particles (default: true) */
  includeDebris?: boolean;
  /** Include trailing smoke column (default: true) */
  includeSmoke?: boolean;
  /** Duration of the entire effect sequence (default: 3) */
  duration?: number;
}

export interface MuzzleFlashOptions extends VFXEffectOptions {
  /** Weapon caliber affects flash size/duration */
  caliber?: 'small' | 'medium' | 'large' | 'shotgun';
  /** Flash direction (default: forward Z) */
  direction?: Vector3;
  /** Include post-flash smoke wisps (default: true) */
  includeSmoke?: boolean;
  /** Include spark particles (default: true) */
  includeSparks?: boolean;
}

export interface DustOptions extends VFXEffectOptions {
  /** Dust color preset or custom hex */
  dustColor?: 'sand' | 'dirt' | 'concrete' | 'ash' | number;
  /** Cloud volume radius (default: 2) */
  volume?: number;
  /** Dispersal speed multiplier (default: 1) */
  dispersalSpeed?: number;
  /** Emission pattern */
  source?: 'impact' | 'trail' | 'collapse';
  /** Duration in seconds (default: 3) */
  duration?: number;
  /** Looping (default: false for impact, true for trail) */
  looping?: boolean;
}

export interface ImpactOptions extends VFXEffectOptions {
  /** Surface material determines spark color and behavior */
  surfaceMaterial?: 'metal' | 'concrete' | 'wood' | 'dirt';
  /** Surface normal for directional emission */
  normal?: Vector3;
}

export interface SparksOptions extends VFXEffectOptions {
  /** Spark type */
  sparkType?: 'grinding' | 'electrical' | 'ricochet' | 'welding';
  /** Emission direction */
  direction?: Vector3;
  /** Looping (default: true for grinding/welding, false for ricochet) */
  looping?: boolean;
}

export interface RainOptions extends VFXEffectOptions {
  /** Coverage area width and depth (default: 20) */
  areaSize?: number;
  /** Height above origin to emit from (default: 15) */
  emitHeight?: number;
  /** Rain intensity preset */
  preset?: 'light' | 'moderate' | 'heavy' | 'storm';
}

export interface SnowOptions extends VFXEffectOptions {
  /** Coverage area width and depth (default: 20) */
  areaSize?: number;
  /** Height above origin to emit from (default: 15) */
  emitHeight?: number;
  /** Snow intensity preset */
  preset?: 'light' | 'moderate' | 'heavy' | 'blizzard';
}

export interface SteamOptions extends VFXEffectOptions {
  /** Steam density (default: 1) */
  density?: number;
  /** Upward velocity (default: 2) */
  riseSpeed?: number;
  /** Spread angle in degrees (default: 15) */
  spreadAngle?: number;
  /** Looping (default: true) */
  looping?: boolean;
}
