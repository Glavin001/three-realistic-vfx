import { BatchedRenderer } from 'three.quarks';
import type { Texture } from 'three';
import type { VFXComposite } from './VFXComposite';

/**
 * Manages the three.quarks BatchedRenderer and all active VFX effects.
 * Add this to your Three.js scene and call update() each frame.
 */
export class VFXRenderer extends BatchedRenderer {
  private effects: Set<VFXComposite> = new Set();

  constructor() {
    super();
    this.name = 'VFXRenderer';
  }

  /** Register a composite effect and add all its particle systems to the batch renderer. */
  addEffect(effect: VFXComposite): void {
    this.effects.add(effect);
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

  /** Set depth texture for soft particle rendering. */
  enableSoftParticles(depthTexture: Texture): void {
    this.setDepthTexture(depthTexture);
  }

  /** Dispose of all effects and clean up. */
  dispose(): void {
    for (const effect of this.effects) {
      effect.dispose();
    }
    this.effects.clear();
  }
}
