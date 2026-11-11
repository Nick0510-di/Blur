/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class PostProcessManager {
  public composer: EffectComposer | null = null;
  public isSoftwareGl: boolean = false;
  private bloomPass: UnrealBloomPass | null = null;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.detectSoftwareGl(renderer);

    if (!this.isSoftwareGl) {
      try {
        const renderPass = new RenderPass(scene, camera);
        const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);

        this.bloomPass = new UnrealBloomPass(
          resolution,
          1.15, // strength
          0.45, // radius
          0.82  // threshold
        );

        this.composer = new EffectComposer(renderer);
        this.composer.addPass(renderPass);
        this.composer.addPass(this.bloomPass);
      } catch {
        this.composer = null;
      }
    }
  }

  private detectSoftwareGl(renderer: THREE.WebGLRenderer): void {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      const gpu = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL));
      this.isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    }
  }

  public setSize(width: number, height: number): void {
    if (this.composer) {
      this.composer.setSize(width, height);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }
  }

  public setBloomIntensity(intensity: number): void {
    if (this.bloomPass) {
      this.bloomPass.strength = intensity;
    }
  }

  public render(dt: number, renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    if (this.composer && !this.isSoftwareGl) {
      this.composer.render(dt);
    } else {
      renderer.render(scene, camera);
    }
  }

  public dispose(): void {
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
  }
}
