import { TextureLoader, Texture, LinearFilter, SRGBColorSpace } from 'three';
import { FrameOverLife, PiecewiseBezier, Bezier } from 'three.quarks';
import type { Behavior } from 'three.quarks';

/**
 * Metadata for a flipbook element texture.
 *
 * These are ELEMENT flipbooks — individual smoke puffs, fire balls, cloud wisps —
 * not complete composed effects. We use them as particle textures, composing many
 * instances spatially with our emitter shapes for volumetric results.
 *
 * Source: Unity Labs CC0 VFX Image Sequences
 * https://unity.com/blog/engine-platform/free-vfx-image-sequences-flipbooks
 */
export interface FlipbookMeta {
  /** Display name */
  name: string;
  /** Filename in assets/flipbooks/ */
  filename: string;
  /** Tile columns in the sprite sheet */
  uTileCount: number;
  /** Tile rows in the sprite sheet */
  vTileCount: number;
  /** Total number of frames (may be less than uTileCount * vTileCount) */
  frameCount: number;
  /** Which effect category this element belongs to */
  category: 'smoke' | 'cloud' | 'explosion' | 'fire' | 'flame';
  /** Texture width in pixels */
  width: number;
  /** Texture height in pixels */
  height: number;
}

/**
 * Registry of available flipbook element textures.
 *
 * These are individual ELEMENT pieces (a single smoke puff, a single fireball)
 * that our particle systems compose spatially into full volumetric effects.
 * This is the AAA approach: many element instances at different depths and sizes
 * create convincing volume through parallax.
 */
export const FLIPBOOK_ELEMENTS: Record<string, FlipbookMeta> = {
  // ── Smoke elements ──
  CandleSmoke01: {
    name: 'Candle Smoke',
    filename: 'CandleSmoke01_20x4.png',
    uTileCount: 20,
    vTileCount: 4,
    frameCount: 80,
    category: 'smoke',
    width: 1024,
    height: 512,
  },
  WispySmoke01: {
    name: 'Wispy Smoke 1',
    filename: 'WispySmoke01_8x8.png',
    uTileCount: 8,
    vTileCount: 8,
    frameCount: 64,
    category: 'smoke',
    width: 1024,
    height: 1024,
  },
  WispySmoke02: {
    name: 'Wispy Smoke 2',
    filename: 'WispySmoke02_8x8.png',
    uTileCount: 8,
    vTileCount: 8,
    frameCount: 64,
    category: 'smoke',
    width: 1024,
    height: 1024,
  },
  WispySmoke03: {
    name: 'Wispy Smoke 3',
    filename: 'WispySmoke03_8x8.png',
    uTileCount: 8,
    vTileCount: 8,
    frameCount: 64,
    category: 'smoke',
    width: 1024,
    height: 1024,
  },

  // ── Cloud elements ──
  Cloud01: {
    name: 'Cloud 1',
    filename: 'Cloud01_8x8.png',
    uTileCount: 8,
    vTileCount: 8,
    frameCount: 64,
    category: 'cloud',
    width: 1024,
    height: 1024,
  },
  Cloud02: {
    name: 'Cloud 2',
    filename: 'Cloud02_8x8.png',
    uTileCount: 8,
    vTileCount: 8,
    frameCount: 64,
    category: 'cloud',
    width: 1024,
    height: 1024,
  },
  Cloud03: {
    name: 'Cloud 3',
    filename: 'Cloud03_8x8.png',
    uTileCount: 8,
    vTileCount: 8,
    frameCount: 64,
    category: 'cloud',
    width: 1024,
    height: 1024,
  },

  // ── Explosion elements (smoke-only, no fire — composable!) ──
  Explosion01Light: {
    name: 'Explosion Light',
    filename: 'Explosion01-light_5x5.png',
    uTileCount: 5,
    vTileCount: 5,
    frameCount: 25,
    category: 'explosion',
    width: 1024,
    height: 1024,
  },
  Explosion01LightNoFire: {
    name: 'Explosion Light (no fire)',
    filename: 'Explosion01-light-nofire_5x5.png',
    uTileCount: 5,
    vTileCount: 5,
    frameCount: 25,
    category: 'explosion',
    width: 1024,
    height: 1024,
  },
  Explosion01NoFire: {
    name: 'Explosion (no fire)',
    filename: 'Explosion01-nofire_5x5.png',
    uTileCount: 5,
    vTileCount: 5,
    frameCount: 25,
    category: 'explosion',
    width: 1024,
    height: 1024,
  },
  Explosion02: {
    name: 'Explosion 2',
    filename: 'Explosion02_5x5.png',
    uTileCount: 5,
    vTileCount: 5,
    frameCount: 25,
    category: 'explosion',
    width: 1024,
    height: 1024,
  },

  // ── Fire elements ──
  FireBall01: {
    name: 'Fireball 1',
    filename: 'FireBall01_8x8.png',
    uTileCount: 8,
    vTileCount: 8,
    frameCount: 64,
    category: 'fire',
    width: 1024,
    height: 1024,
  },
  FireBall02: {
    name: 'Fireball 2',
    filename: 'FireBall02_8x8.png',
    uTileCount: 8,
    vTileCount: 8,
    frameCount: 64,
    category: 'fire',
    width: 1024,
    height: 1024,
  },
  FireBall03: {
    name: 'Fireball 3',
    filename: 'FireBall03_8x8.png',
    uTileCount: 8,
    vTileCount: 8,
    frameCount: 64,
    category: 'fire',
    width: 1024,
    height: 1024,
  },

  // ── Flame elements ──
  Flame03: {
    name: 'Flame',
    filename: 'Flame03_16x4.png',
    uTileCount: 16,
    vTileCount: 4,
    frameCount: 64,
    category: 'flame',
    width: 1024,
    height: 512,
  },
};

// Cache for loaded textures
const textureCache = new Map<string, Texture>();
const loader = new TextureLoader();

/**
 * Load a flipbook element texture by key.
 *
 * @param key - Key from FLIPBOOK_ELEMENTS (e.g., 'WispySmoke01', 'FireBall02')
 * @param basePath - Base URL path to the flipbook PNGs (default: '/assets/flipbooks/')
 * @returns Promise resolving to the loaded THREE.Texture
 *
 * @example
 * ```ts
 * const texture = await loadFlipbook('WispySmoke01');
 * const smoke = createSmoke(renderer, { texture });
 * ```
 */
export async function loadFlipbook(
  key: string,
  basePath = '/assets/flipbooks/',
): Promise<Texture> {
  const meta = FLIPBOOK_ELEMENTS[key];
  if (!meta) {
    throw new Error(
      `Unknown flipbook key "${key}". Available: ${Object.keys(FLIPBOOK_ELEMENTS).join(', ')}`
    );
  }

  // Return cached texture if available
  const cached = textureCache.get(key);
  if (cached) return cached;

  const url = `${basePath}${meta.filename}`;

  return new Promise<Texture>((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        textureCache.set(key, texture);
        resolve(texture);
      },
      undefined,
      (err) => reject(new Error(`Failed to load flipbook "${key}" from ${url}: ${err}`)),
    );
  });
}

/**
 * Load multiple flipbook textures at once.
 *
 * @param keys - Array of keys from FLIPBOOK_ELEMENTS
 * @param basePath - Base URL path to the flipbook PNGs
 * @returns Promise resolving to a Map of key -> Texture
 */
export async function loadFlipbooks(
  keys: string[],
  basePath = '/assets/flipbooks/',
): Promise<Map<string, Texture>> {
  const results = await Promise.all(
    keys.map(async (key) => {
      const texture = await loadFlipbook(key, basePath);
      return [key, texture] as const;
    })
  );
  return new Map(results);
}

/**
 * Get the flipbook metadata for a key (tile counts, frame count, etc.).
 * Used internally when configuring ParticleSystem with flipbook textures.
 */
export function getFlipbookMeta(key: string): FlipbookMeta {
  const meta = FLIPBOOK_ELEMENTS[key];
  if (!meta) {
    throw new Error(`Unknown flipbook key "${key}".`);
  }
  return meta;
}

/**
 * Create a FrameOverLife behavior that plays through all frames of a flipbook
 * over the particle's lifetime. This makes each particle an animated element.
 *
 * @param meta - Flipbook metadata (from getFlipbookMeta or FLIPBOOK_ELEMENTS)
 * @returns FrameOverLife behavior to add to a ParticleSystem
 */
export function flipbookFrameOverLife(meta: FlipbookMeta): Behavior {
  // Animate from frame 0 to frameCount-1 over the particle lifetime
  return new FrameOverLife(
    new PiecewiseBezier([[new Bezier(0, meta.frameCount / 3, (meta.frameCount * 2) / 3, meta.frameCount - 1), 0]])
  );
}

/**
 * Get all flipbook keys for a given category.
 *
 * @example
 * ```ts
 * const smokeKeys = getFlipbooksByCategory('smoke');
 * // ['CandleSmoke01', 'WispySmoke01', 'WispySmoke02', 'WispySmoke03']
 * ```
 */
export function getFlipbooksByCategory(
  category: FlipbookMeta['category'],
): string[] {
  return Object.entries(FLIPBOOK_ELEMENTS)
    .filter(([_, meta]) => meta.category === category)
    .map(([key]) => key);
}

/** Clear all cached flipbook textures. */
export function clearFlipbookCache(): void {
  for (const texture of textureCache.values()) {
    texture.dispose();
  }
  textureCache.clear();
}
