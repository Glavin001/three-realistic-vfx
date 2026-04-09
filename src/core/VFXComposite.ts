import { Object3D } from 'three';
import type { ParticleSystem } from 'three.quarks';
import type { VFXRenderer } from './VFXRenderer';

/**
 * Groups multiple three.quarks ParticleSystem instances into a single coherent effect.
 * Each realistic effect is composed of 2-6 sub-systems layered together.
 */
export class VFXComposite extends Object3D {
  readonly systems: ParticleSystem[] = [];
  private _renderer: VFXRenderer | null = null;

  constructor(name: string) {
    super();
    this.name = name;
  }

  /** Add a particle system to this composite effect. */
  addSystem(system: ParticleSystem): void {
    this.systems.push(system);
    this.add(system.emitter);
  }

  /** Attach to a VFXRenderer (called automatically by VFXRenderer.addEffect). */
  attachRenderer(renderer: VFXRenderer): void {
    this._renderer = renderer;
  }

  /** Start or restart all sub-systems. */
  play(): void {
    for (const system of this.systems) {
      system.restart();
    }
  }

  /** Stop emission on all sub-systems (existing particles finish their lifetime). */
  stop(): void {
    for (const system of this.systems) {
      system.endEmit();
    }
  }

  /** Pause all sub-systems. */
  pause(): void {
    for (const system of this.systems) {
      system.pause();
    }
  }

  /** Resume all sub-systems. */
  resume(): void {
    for (const system of this.systems) {
      system.play();
    }
  }

  /** Fully dispose of all sub-systems and clean up. */
  dispose(): void {
    if (this._renderer) {
      for (const system of this.systems) {
        this._renderer.deleteSystem(system);
      }
    }
    for (const system of this.systems) {
      system.dispose();
    }
    this.systems.length = 0;
    this.removeFromParent();
  }
}
