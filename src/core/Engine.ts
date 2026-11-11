/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GAME_CONFIG } from '../config/gameConfig';
import { TrackCurve } from '../track/TrackCurve';
import { TrackBuilder } from '../track/TrackBuilder';
import { PlayerCar } from '../entities/PlayerCar';
import { ChaseCamera } from './ChaseCamera';
import { InputManager } from './InputManager';
import { SoundManager } from '../audio/SoundManager';
import { PostProcessManager } from '../effects/PostProcess';
import { RaceTelemetry } from '../types/game';

export class GameEngine {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  public trackCurve: TrackCurve;
  public trackBuilder: TrackBuilder;
  public playerCar: PlayerCar;
  public chaseCam: ChaseCamera;
  public input: InputManager;
  public sound: SoundManager;
  public postProcess: PostProcessManager;

  private container: HTMLElement;
  private isRunning: boolean = false;
  private animationFrameId: number = 0;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private fixedStep: number = GAME_CONFIG.physics.fixedTimeStep;
  public isSoftwareGl: boolean = false;

  private onTelemetryCallback?: (telemetry: RaceTelemetry) => void;

  constructor(container: HTMLElement, onTelemetry?: (telemetry: RaceTelemetry) => void) {
    this.container = container;
    this.onTelemetryCallback = onTelemetry;

    // 1. Detect software WebGL
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Initialize Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 3. Initialize Scene, Fog & Environment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050711);
    this.scene.fog = new THREE.FogExp2(0x050711, 0.0032);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 4. Lighting Rig
    this.setupLighting();

    // 5. Track & City Builder
    this.trackCurve = new TrackCurve(GAME_CONFIG.track.samplesCount);
    this.trackBuilder = new TrackBuilder(this.trackCurve);
    this.scene.add(this.trackBuilder.group);

    // 6. Player Vehicle
    this.playerCar = new PlayerCar(this.trackCurve, 0.005, 0);
    this.scene.add(this.playerCar.mesh);

    // 7. Chase Camera
    this.chaseCam = new ChaseCamera(GAME_CONFIG.camera.fovMin, container.clientWidth / container.clientHeight);
    this.chaseCam.init(this.playerCar);

    // 8. Input, Audio & Post-processing
    this.input = new InputManager();
    this.sound = new SoundManager();
    this.postProcess = new PostProcessManager(this.renderer, this.scene, this.chaseCam.camera);

    // 9. Resize Listener
    window.addEventListener('resize', this.onResize);

    // 10. Start Loop
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick();
  }

  private setupLighting(): void {
    // Cool ambient hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0x00f0ff, 0x050512, 1.2);
    this.scene.add(hemiLight);

    // Warm directional key light
    const dirLight = new THREE.DirectionalLight(0xfff8ee, 1.8);
    dirLight.position.set(60, 100, 40);
    dirLight.castShadow = !this.isSoftwareGl;
    if (dirLight.castShadow) {
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.camera.near = 10;
      dirLight.shadow.camera.far = 400;
      const d = 80;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.bias = -0.0005;
      dirLight.shadow.normalBias = 0.02;
    }
    this.scene.add(dirLight);

    // Dynamic accent lights along track
    const accent1 = new THREE.PointLight(0x00f0ff, 2.5, 60);
    accent1.position.set(0, 12, 20);
    this.scene.add(accent1);

    const accent2 = new THREE.PointLight(0xff007f, 2.5, 60);
    accent2.position.set(0, 12, -150);
    this.scene.add(accent2);
  }

  private onResize = (): void => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.chaseCam.setAspect(width / height);
    this.renderer.setSize(width, height);
    this.postProcess.setSize(width, height);
  };

  private tick = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Cap delta to prevent spiral of death on tab switch
    if (dt > 0.1) dt = 0.1;

    // Fixed timestep physics accumulator
    this.accumulator += dt;
    const inputState = this.input.getInput();

    while (this.accumulator >= this.fixedStep) {
      this.playerCar.update(this.fixedStep, inputState);

      // Handle power-up activation in Stage 1 test (Space triggers nitro test)
      if (inputState.powerup && !this.playerCar.isNitroActive) {
        this.playerCar.triggerNitro(3.2);
        this.chaseCam.addShake(1.2);
      }

      this.accumulator -= this.fixedStep;
    }

    // Update Chase Camera
    this.chaseCam.update(this.playerCar, dt);

    // Update Web Audio
    const throttle = inputState.forward ? 1 : inputState.backward ? -1 : 0;
    this.sound.updateCarSpeed(
      Math.abs(this.playerCar.state.speed),
      throttle,
      this.playerCar.isNitroActive
    );

    // Emit telemetry for HUD
    if (this.onTelemetryCallback) {
      const speedKmh = Math.abs(this.playerCar.state.speed) * 3.6;
      const speedPercent = Math.min(100, (speedKmh / 220) * 100);
      const nowSec = performance.now() / 1000;
      const currentLapTime = nowSec - this.playerCar.state.lapStartTime;

      this.onTelemetryCallback({
        speedKmh,
        speedPercent,
        lap: this.playerCar.state.lap,
        maxLaps: GAME_CONFIG.race.totalLaps,
        lapProgress: this.playerCar.state.trackProgress,
        currentLapTime,
        bestLapTime: this.playerCar.state.bestLapTime,
        lastLapTime: this.playerCar.state.currentLapTime || null,
        position: 1,
        totalRacers: 1,
        health: this.playerCar.state.health,
        maxHealth: this.playerCar.state.maxHealth,
        isDrifting: this.playerCar.state.isDrifting,
        activePowerUp: this.playerCar.isNitroActive ? 'nitro' : null,
        powerUpSlots: this.playerCar.powerUpSlots,
        isFinished: this.playerCar.state.isFinished,
      });
    }

    // Render pass
    this.postProcess.render(dt, this.renderer, this.scene, this.chaseCam.camera);

    // Schedule next frame
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.animationFrameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.animationFrameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.animationFrameId = window.setTimeout(cb, 60);
      }
    };
    this.animationFrameId = window.setTimeout(poll, 5);
  }

  public resetCarToTrack(): void {
    const proj = this.trackCurve.findClosestProjection(this.playerCar.state.position);
    this.playerCar.state.position.copy(proj.point);
    this.playerCar.state.position.y += 0.4;
    this.playerCar.state.direction.copy(proj.tangent);
    this.playerCar.state.velocity.set(0, 0, 0);
    this.playerCar.state.speed = 0;
    this.playerCar.state.driftAngle = 0;
    this.playerCar.state.isDrifting = false;
    this.chaseCam.init(this.playerCar);
  }

  public dispose(): void {
    this.isRunning = false;
    if (this.isSoftwareGl) {
      clearTimeout(this.animationFrameId);
    } else {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize);

    this.input.dispose();
    this.sound.dispose();
    this.trackBuilder.dispose();
    this.playerCar.dispose();
    this.postProcess.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
