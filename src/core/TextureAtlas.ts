import { CanvasTexture, NearestFilter, LinearFilter, RepeatWrapping, SRGBColorSpace } from 'three';

// Simple 2D Perlin-like noise for texture generation
function hashNoise(x: number, y: number): number {
  let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hashNoise(ix, iy);
  const b = hashNoise(ix + 1, iy);
  const c = hashNoise(ix, iy + 1);
  const d = hashNoise(ix + 1, iy + 1);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * smoothNoise(x * frequency, y * frequency);
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value;
}

/**
 * Tile types available in the procedural atlas.
 * The atlas is a 4x4 grid (16 tiles).
 */
export enum TileIndex {
  /** Gaussian soft circle - for smoke, dust, glow */
  SoftCircle = 0,
  /** Noise-distorted blob variant 1 - for flames */
  NoiseBlob1 = 1,
  /** Noise-distorted blob variant 2 - for smoke variation */
  NoiseBlob2 = 2,
  /** Noise-distorted blob variant 3 - for fire variation */
  NoiseBlob3 = 3,
  /** Sharp bright circle - for embers, hot particles */
  BrightDot = 4,
  /** Star/spark shape with rays - for sparks, flash */
  Star = 5,
  /** Hollow ring - for shockwave */
  Ring = 6,
  /** Elongated streak - for rain, fast sparks */
  Streak = 7,
  /** Soft square with rounded edges - for dust volume */
  SoftSquare = 8,
  /** Perlin noise cloud - for volumetric smoke */
  CloudNoise1 = 9,
  /** Perlin noise cloud variant - for variety */
  CloudNoise2 = 10,
  /** Perlin noise cloud variant - for variety */
  CloudNoise3 = 11,
  /** Wispy tendril shape - for smoke wisps */
  Wisp = 12,
  /** Small debris chunk shape */
  Debris = 13,
  /** Flame lick shape - tall and narrow */
  FlameLick = 14,
  /** Uniform white - utility tile */
  White = 15,
}

const ATLAS_SIZE = 512;
const TILE_COUNT = 4; // 4x4 grid
const TILE_SIZE = ATLAS_SIZE / TILE_COUNT; // 128px per tile

type TileDrawer = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
) => void;

function drawSoftCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const r = size / 2;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.4, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(cx - r, cy - r, size, size);
}

function drawNoiseBlob(seed: number): TileDrawer {
  return (ctx, cx, cy, size) => {
    const r = size / 2;
    const imageData = ctx.getImageData(cx - r, cy - r, size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - r) / r;
        const dy = (y - r) / r;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Base circle falloff
        let alpha = Math.max(0, 1 - dist);
        alpha = alpha * alpha; // Quadratic falloff

        // Noise distortion
        const noise = fbm(x * 0.05 + seed * 13.7, y * 0.05 + seed * 7.3, 4);
        alpha *= 0.3 + noise * 0.7;

        // Edge erosion
        if (dist > 0.6) {
          alpha *= Math.max(0, 1 - (dist - 0.6) / 0.4);
        }

        const idx = (y * size + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = Math.floor(Math.max(0, Math.min(1, alpha)) * 255);
      }
    }
    ctx.putImageData(imageData, cx - r, cy - r);
  };
}

function drawBrightDot(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const r = size / 2;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.4);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(cx - r, cy - r, size, size);
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const r = size / 2;
  const imageData = ctx.getImageData(cx - r, cy - r, size, size);
  const data = imageData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - r) / r;
      const dy = (y - r) / r;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      // Core glow
      let alpha = Math.max(0, 1 - dist * 2);
      alpha = alpha * alpha;

      // Rays (6-pointed)
      const ray = Math.pow(Math.abs(Math.cos(angle * 3)), 8);
      const rayAlpha = ray * Math.max(0, 1 - dist);

      alpha = Math.max(alpha, rayAlpha * 0.7);

      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.floor(Math.max(0, Math.min(1, alpha)) * 255);
    }
  }
  ctx.putImageData(imageData, cx - r, cy - r);
}

function drawRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const r = size / 2;
  const imageData = ctx.getImageData(cx - r, cy - r, size, size);
  const data = imageData.data;
  const ringCenter = 0.7;
  const ringWidth = 0.15;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - r) / r;
      const dy = (y - r) / r;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const ringDist = Math.abs(dist - ringCenter) / ringWidth;
      let alpha = Math.max(0, 1 - ringDist);
      alpha = alpha * alpha;

      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.floor(Math.max(0, Math.min(1, alpha)) * 255);
    }
  }
  ctx.putImageData(imageData, cx - r, cy - r);
}

function drawStreak(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const r = size / 2;
  const imageData = ctx.getImageData(cx - r, cy - r, size, size);
  const data = imageData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - r) / r;
      const dy = (y - r) / r;

      // Elongated horizontally
      const distX = Math.abs(dx);
      const distY = Math.abs(dy) * 4; // Squeeze vertically
      const dist = Math.sqrt(distX * distX + distY * distY);

      let alpha = Math.max(0, 1 - dist);
      alpha = alpha * alpha * alpha;

      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.floor(Math.max(0, Math.min(1, alpha)) * 255);
    }
  }
  ctx.putImageData(imageData, cx - r, cy - r);
}

function drawSoftSquare(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const r = size / 2;
  const imageData = ctx.getImageData(cx - r, cy - r, size, size);
  const data = imageData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.abs((x - r) / r);
      const dy = Math.abs((y - r) / r);
      const dist = Math.max(dx, dy);

      let alpha = Math.max(0, 1 - dist);
      alpha = alpha * alpha;

      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.floor(Math.max(0, Math.min(1, alpha)) * 255);
    }
  }
  ctx.putImageData(imageData, cx - r, cy - r);
}

function drawCloudNoise(seed: number): TileDrawer {
  return (ctx, cx, cy, size) => {
    const r = size / 2;
    const imageData = ctx.getImageData(cx - r, cy - r, size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - r) / r;
        const dy = (y - r) / r;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const noise = fbm(x * 0.04 + seed * 17.1, y * 0.04 + seed * 23.3, 5);
        let alpha = noise * (1 - dist * dist);
        alpha = Math.max(0, alpha);

        // Soft edge
        if (dist > 0.5) {
          alpha *= Math.max(0, 1 - (dist - 0.5) / 0.5);
        }

        const idx = (y * size + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = Math.floor(Math.max(0, Math.min(1, alpha)) * 255);
      }
    }
    ctx.putImageData(imageData, cx - r, cy - r);
  };
}

function drawWisp(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const r = size / 2;
  const imageData = ctx.getImageData(cx - r, cy - r, size, size);
  const data = imageData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - r) / r;
      const dy = (y - r) / r;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Wispy tendril shape using noise distortion
      const angle = Math.atan2(dy, dx);
      const noise = fbm(angle * 2 + 5, dist * 3 + 2, 3);
      let alpha = (1 - dist) * noise;
      alpha = Math.max(0, alpha * 0.8);

      if (dist > 0.8) {
        alpha *= Math.max(0, 1 - (dist - 0.8) / 0.2);
      }

      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.floor(Math.max(0, Math.min(1, alpha)) * 255);
    }
  }
  ctx.putImageData(imageData, cx - r, cy - r);
}

function drawDebris(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const r = size / 2;
  const imageData = ctx.getImageData(cx - r, cy - r, size, size);
  const data = imageData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - r) / r;
      const dy = (y - r) / r;
      // Irregular angular shape
      const angle = Math.atan2(dy, dx);
      const edgeDist = 0.3 + 0.15 * Math.sin(angle * 5) + 0.1 * Math.sin(angle * 3 + 1);
      const dist = Math.sqrt(dx * dx + dy * dy);

      let alpha = dist < edgeDist ? 1 : 0;
      // Slight edge softening
      if (dist > edgeDist - 0.05 && dist < edgeDist) {
        alpha = (edgeDist - dist) / 0.05;
      }

      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.floor(Math.max(0, Math.min(1, alpha)) * 255);
    }
  }
  ctx.putImageData(imageData, cx - r, cy - r);
}

function drawFlameLick(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const r = size / 2;
  const imageData = ctx.getImageData(cx - r, cy - r, size, size);
  const data = imageData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - r) / r;
      const dy = (y - r) / r;

      // Tall narrow shape, wider at bottom
      const widthAtY = 0.3 + 0.4 * ((dy + 1) / 2); // wider at bottom
      const xDist = Math.abs(dx) / widthAtY;

      let alpha = Math.max(0, 1 - xDist) * Math.max(0, 1 - Math.abs(dy));

      // Noise for flicker
      const noise = fbm(x * 0.08 + 3.7, y * 0.08 + 1.3, 3);
      alpha *= 0.5 + noise * 0.5;
      alpha = alpha * alpha;

      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = Math.floor(Math.max(0, Math.min(1, alpha)) * 255);
    }
  }
  ctx.putImageData(imageData, cx - r, cy - r);
}

function drawWhite(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
}

const TILE_DRAWERS: TileDrawer[] = [
  drawSoftCircle,           // 0: SoftCircle
  drawNoiseBlob(1),         // 1: NoiseBlob1
  drawNoiseBlob(2),         // 2: NoiseBlob2
  drawNoiseBlob(3),         // 3: NoiseBlob3
  drawBrightDot,            // 4: BrightDot
  drawStar,                 // 5: Star
  drawRing,                 // 6: Ring
  drawStreak,               // 7: Streak
  drawSoftSquare,           // 8: SoftSquare
  drawCloudNoise(1),        // 9: CloudNoise1
  drawCloudNoise(2),        // 10: CloudNoise2
  drawCloudNoise(3),        // 11: CloudNoise3
  drawWisp,                 // 12: Wisp
  drawDebris,               // 13: Debris
  drawFlameLick,            // 14: FlameLick
  drawWhite,                // 15: White
];

let cachedAtlas: CanvasTexture | null = null;

/**
 * Create or return the cached procedural particle texture atlas.
 * 512x512 canvas with a 4x4 grid of particle textures.
 */
export function getParticleAtlas(): CanvasTexture {
  if (cachedAtlas) return cachedAtlas;

  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d')!;

  // Clear to transparent black
  ctx.clearRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);

  // Draw each tile
  for (let i = 0; i < TILE_DRAWERS.length; i++) {
    const col = i % TILE_COUNT;
    const row = Math.floor(i / TILE_COUNT);
    const cx = col * TILE_SIZE + TILE_SIZE / 2;
    const cy = row * TILE_SIZE + TILE_SIZE / 2;
    TILE_DRAWERS[i](ctx, cx, cy, TILE_SIZE);
  }

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  cachedAtlas = texture;
  return texture;
}

/** Clear the cached atlas (useful for cleanup or regeneration). */
export function clearAtlasCache(): void {
  if (cachedAtlas) {
    cachedAtlas.dispose();
    cachedAtlas = null;
  }
}

export { TILE_COUNT as ATLAS_TILE_COUNT };
