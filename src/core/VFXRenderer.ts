import { BatchedRenderer } from 'three.quarks';
import type { Texture, WebGLRenderer, WebGLRenderTarget } from 'three';
import type { VFXComposite } from './VFXComposite';

/**
 * Manages the three.quarks BatchedRenderer and all active VFX effects.
 * Add this to your Three.js scene and call update() each frame.
 *
 * For soft particle support (particles fade when intersecting geometry),
 * call `enableSoftParticles(depthTexture)` with your scene's depth texture,
 * or use `setupSoftParticlesFromRenderTarget(target)` if you have a
 * WebGLRenderTarget with a depth texture attached.
 */
export class VFXRenderer extends BatchedRenderer {
  private effects: Set<VFXComposite> = new Set();
  private _softParticlesEnabled = false;

  constructor() {
    super();
    this.name = 'VFXRenderer';
  }

  /** Whether soft particles are currently active. */
  get softParticlesEnabled(): boolean {
    return this._softParticlesEnabled;
  }

  /** Register a composite effect and add all its particle systems to the batch renderer. */
  addEffect(effect: VFXComposite): void {
    this.effects.add(effect);
    effect.attachRenderer(this);
    for (const system of effect.systems) {
      this.addSystem(system);
    }
    this.add(effect);
  }

  /** Remove a composite effect and its particle systems from the batch renderer. */
  removeEffect(effect: VFXComposite): void {
    this.effects.delete(effect);
    for (const system of effect.systems) {
      this.deleteSystem(system);
    }
    this.remove(effect);
  }

  /**
   * Enable soft particle rendering by providing a depth texture.
   * Particles will fade out where they intersect scene geometry,
   * preventing hard clipping artifacts.
   */
  enableSoftParticles(depthTexture: Texture): void {
    this.setDepthTexture(depthTexture);
    this._softParticlesEnabled = true;
  }

  /** Disable soft particle rendering. */
  disableSoftParticles(): void {
    this.setDepthTexture(null);
    this._softParticlesEnabled = false;
  }

  /**
   * Set up soft particles from a WebGLRenderTarget that has a depth texture.
   * Convenience method — equivalent to `enableSoftParticles(target.depthTexture)`.
   */
  setupSoftParticlesFromRenderTarget(target: WebGLRenderTarget): void {
    if (target.depthTexture) {
      this.enableSoftParticles(target.depthTexture);
    }
  }

  /** Dispose of all effects and clean up. */
  dispose(): void {
    for (const effect of this.effects) {
      effect.dispose();
    }
    this.effects.clear();
  }
}
