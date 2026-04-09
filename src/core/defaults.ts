import { Bezier, PiecewiseBezier, ParticleSystem, ConstantValue as QConstantValue } from 'three.quarks';
import { Vector3 as QVector3 } from 'quarks.core';
import { Gradient } from 'three.quarks';
import type { Texture } from 'three';
import type { VFXEffectOptions } from './types';
import { FLIPBOOK_ELEMENTS, flipbookFrameOverLife } from './FlipbookElements';
import type { FlipbookMeta } from './FlipbookElements';

// ── Color palettes (as quarks.core Vector3 RGB, 0-1 range) ──

/** Fire colors: bright yellow core -> orange -> dark red */
export const FIRE_COLORS = {
  coreYellow: new QVector3(1.0, 0.95, 0.4),
  brightOrange: new QVector3(1.0, 0.6, 0.1),
  deepOrange: new QVector3(0.9, 0.3, 0.05),
  darkRed: new QVector3(0.5, 0.1, 0.02),
  emberglow: new QVector3(1.0, 0.4, 0.05),
};

/** Smoke colors */
export const SMOKE_COLORS = {
  lightGray: new QVector3(0.65, 0.65, 0.65),
  mediumGray: new QVector3(0.4, 0.4, 0.42),
  darkGray: new QVector3(0.2, 0.2, 0.22),
  black: new QVector3(0.08, 0.08, 0.1),
  brownish: new QVector3(0.3, 0.25, 0.2),
};

/** Explosion colors */
export const EXPLOSION_COLORS = {
  white: new QVector3(1.0, 1.0, 0.95),
  brightYellow: new QVector3(1.0, 0.9, 0.3),
  orange: new QVector3(1.0, 0.5, 0.1),
  darkRed: new QVector3(0.4, 0.08, 0.02),
};

// ── Common curves (PiecewiseBezier for value-over-lifetime) ──

/** Grows from 0 to 1 over lifetime (ease-in). Good for smoke/dust expanding. */
export function growCurve(): PiecewiseBezier {
  return new PiecewiseBezier([[new Bezier(0, 0.3, 0.7, 1), 0]]);
}

/** Shrinks from 1 to 0 over lifetime (ease-out). Good for fading sparks. */
export function shrinkCurve(): PiecewiseBezier {
  return new PiecewiseBezier([[new Bezier(1, 0.7, 0.3, 0), 0]]);
}

/** Bell curve: grows then shrinks. Good for flames. */
export function bellCurve(): PiecewiseBezier {
  return new PiecewiseBezier([
    [new Bezier(0, 0.8, 1, 1), 0],
    [new Bezier(1, 1, 0.2, 0), 0.4],
  ]);
}

/** Fast start, slow decay. Good for explosion expansion. */
export function explosionSizeCurve(): PiecewiseBezier {
  return new PiecewiseBezier([[new Bezier(0, 1, 1, 1), 0]]);
}

/** Deceleration curve: starts fast, slows down. Good for speed-over-life. */
export function decelerateCurve(): PiecewiseBezier {
  return new PiecewiseBezier([[new Bezier(1, 0.5, 0.2, 0.05), 0]]);
}

/** Constant value of 1 as a curve. */
export function constantOneCurve(): PiecewiseBezier {
  return new PiecewiseBezier([[new Bezier(1, 1, 1, 1), 0]]);
}

/** Fades from 1 to 0 linearly. */
export function linearFadeCurve(): PiecewiseBezier {
  return new PiecewiseBezier([[new Bezier(1, 0.66, 0.33, 0), 0]]);
}

// ── Gradient helpers ──

/** Fire gradient: yellow -> orange -> dark red -> transparent */
export function fireGradient(): Gradient {
  return new Gradient(
    [
      [FIRE_COLORS.coreYellow.clone(), 0],
      [FIRE_COLORS.brightOrange.clone(), 0.3],
      [FIRE_COLORS.deepOrange.clone(), 0.6],
      [FIRE_COLORS.darkRed.clone(), 0.85],
    ],
    [
      [1, 0],
      [0.9, 0.3],
      [0.6, 0.7],
      [0, 1],
    ]
  );
}

/** Smoke gradient: solid gray -> transparent */
export function smokeGradient(colorKey: keyof typeof SMOKE_COLORS = 'darkGray'): Gradient {
  const color = SMOKE_COLORS[colorKey];
  return new Gradient(
    [
      [color.clone(), 0],
      [color.clone(), 0.5],
      [SMOKE_COLORS.lightGray.clone(), 1],
    ],
    [
      [0.6, 0],
      [0.5, 0.3],
      [0.3, 0.7],
      [0, 1],
    ]
  );
}

/** Explosion gradient: white -> yellow -> orange -> dark red -> transparent */
export function explosionGradient(): Gradient {
  return new Gradient(
    [
      [EXPLOSION_COLORS.white.clone(), 0],
      [EXPLOSION_COLORS.brightYellow.clone(), 0.15],
      [EXPLOSION_COLORS.orange.clone(), 0.4],
      [EXPLOSION_COLORS.darkRed.clone(), 0.7],
    ],
    [
      [1, 0],
      [0.9, 0.2],
      [0.5, 0.6],
      [0, 1],
    ]
  );
}

/** Ember gradient: bright orange-yellow -> red -> transparent */
export function emberGradient(): Gradient {
  return new Gradient(
    [
      [FIRE_COLORS.emberglow.clone(), 0],
      [FIRE_COLORS.darkRed.clone(), 0.7],
    ],
    [
      [1, 0],
      [0.8, 0.5],
      [0, 1],
    ]
  );
}

// ── Soft particle helper ──

/**
 * Apply soft particle settings to a ParticleSystem based on effect options.
 * Soft particles fade out where they intersect scene geometry, preventing
 * hard billboard clipping artifacts. This is standard in AAA particle systems.
 */
export function applySoftParticles(
  system: ParticleSystem,
  options: VFXEffectOptions,
): void {
  const { softParticles = true, softNearFade = 0.1, softFarFade = 1.0 } = options;
  if (softParticles) {
    system.softParticles = true;
    system.softNearFade = softNearFade;
    system.softFarFade = softFarFade;
  }
}

// ── Flipbook helpers ──

/**
 * Resolve a flipbook element key to its texture and metadata.
 * If multiple keys are provided, picks one at random.
 * Returns null if no flipbook is configured.
 */
export function resolveFlipbook(
  options: VFXEffectOptions,
  categoryFilter?: FlipbookMeta['category'],
): { texture: Texture; meta: FlipbookMeta } | null {
  const { flipbook, flipbookTextures } = options;
  if (!flipbook || !flipbookTextures) return null;

  // Resolve key(s)
  const keys = Array.isArray(flipbook) ? flipbook : [flipbook];
  // Filter to requested category if specified
  const validKeys = categoryFilter
    ? keys.filter((k) => FLIPBOOK_ELEMENTS[k]?.category === categoryFilter)
    : keys;

  if (validKeys.length === 0) return null;

  // Pick a random key from the valid set
  const key = validKeys[Math.floor(Math.random() * validKeys.length)];
  const meta = FLIPBOOK_ELEMENTS[key];
  const texture = flipbookTextures.get(key);

  if (!meta || !texture) return null;
  return { texture, meta };
}

/**
 * Apply flipbook configuration to a ParticleSystem.
 * Sets the texture, tile counts, startTileIndex, and adds FrameOverLife animation.
 * This replaces the procedural atlas texture with an animated flipbook element.
 */
export function applyFlipbookToSystem(
  system: ParticleSystem,
  meta: FlipbookMeta,
  texture: Texture,
): void {
  system.texture = texture;
  system.uTileCount = meta.uTileCount;
  system.vTileCount = meta.vTileCount;
  system.startTileIndex = new QConstantValue(0);
  system.addBehavior(flipbookFrameOverLife(meta));
}
