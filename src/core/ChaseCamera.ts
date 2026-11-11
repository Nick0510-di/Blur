/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { PlayerCar } from '../entities/PlayerCar';
import { GAME_CONFIG } from '../config/gameConfig';

export class ChaseCamera {
  public camera: THREE.PerspectiveCamera;
  private currentPosition = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();
  private targetPosition = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private shakeAmount: number = 0;

  // Reusable vectors to prevent GC allocations
  private _carForward = new THREE.Vector3();
  private _carUp = new THREE.Vector3(0, 1, 0);

  constructor(fov: number = 62, aspect: number = window.innerWidth / window.innerHeight) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
  }

  public init(playerCar: PlayerCar): void {
    const carPos = playerCar.state.position;
    const carDir = playerCar.state.direction;

    this.currentPosition
      .copy(carPos)
      .addScaledVector(carDir, -GAME_CONFIG.camera.distanceBehind)
      .addScaledVector(this._carUp, GAME_CONFIG.camera.heightAbove);

    this.currentLookAt
      .copy(carPos)
      .addScaledVector(carDir, GAME_CONFIG.camera.lookAheadDistance);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }

  public addShake(intensity: number): void {
    this.shakeAmount = Math.min(2.5, this.shakeAmount + intensity);
  }

  public update(playerCar: PlayerCar, dt: number): void {
    const camCfg = GAME_CONFIG.camera;
    const carPos = playerCar.state.position;
    const carDir = playerCar.state.direction;
    const speedRatio = Math.min(1.0, Math.max(0, playerCar.state.speed) / GAME_CONFIG.physics.maxSpeed);

    // Dynamic distance & height pulling back slightly at top speed or nitro
    const speedDistanceExtra = speedRatio * 1.8 + (playerCar.isNitroActive ? 1.4 : 0);
    const speedHeightExtra = speedRatio * 0.4;

    this.targetPosition
      .copy(carPos)
      .addScaledVector(carDir, -(camCfg.distanceBehind + speedDistanceExtra))
      .addScaledVector(playerCar.state.up, camCfg.heightAbove + speedHeightExtra);

    this.targetLookAt
      .copy(carPos)
      .addScaledVector(carDir, camCfg.lookAheadDistance + speedRatio * 4.0)
      .addScaledVector(playerCar.state.up, 1.2);

    // Smooth exponential damping
    this.currentPosition.x = THREE.MathUtils.damp(
      this.currentPosition.x,
      this.targetPosition.x,
      camCfg.smoothPositionLambda,
      dt
    );
    this.currentPosition.y = THREE.MathUtils.damp(
      this.currentPosition.y,
      this.targetPosition.y,
      camCfg.smoothPositionLambda,
      dt
    );
    this.currentPosition.z = THREE.MathUtils.damp(
      this.currentPosition.z,
      this.targetPosition.z,
      camCfg.smoothPositionLambda,
      dt
    );

    this.currentLookAt.x = THREE.MathUtils.damp(
      this.currentLookAt.x,
      this.targetLookAt.x,
      camCfg.smoothLookAtLambda,
      dt
    );
    this.currentLookAt.y = THREE.MathUtils.damp(
      this.currentLookAt.y,
      this.targetLookAt.y,
      camCfg.smoothLookAtLambda,
      dt
    );
    this.currentLookAt.z = THREE.MathUtils.damp(
      this.currentLookAt.z,
      this.targetLookAt.z,
      camCfg.smoothLookAtLambda,
      dt
    );

    // Dynamic FOV widening at high speed and nitro
    const targetFov = camCfg.fovMin + speedRatio * (camCfg.fovMax - camCfg.fovMin) + (playerCar.isNitroActive ? 8 : 0);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6.0, dt);
      this.camera.updateProjectionMatrix();
    }

    // Camera shake (from impacts, drift friction, or nitro)
    if (playerCar.isNitroActive) {
      this.shakeAmount = Math.max(this.shakeAmount, 0.4);
    }
    if (playerCar.state.isDrifting) {
      this.shakeAmount = Math.max(this.shakeAmount, 0.15);
    }

    const shakeOffset = new THREE.Vector3();
    if (this.shakeAmount > 0.01) {
      shakeOffset.set(
        (Math.random() - 0.5) * this.shakeAmount * 0.25,
        (Math.random() - 0.5) * this.shakeAmount * 0.25,
        (Math.random() - 0.5) * this.shakeAmount * 0.25
      );
      this.shakeAmount = Math.max(0, this.shakeAmount - camCfg.shakeDecay * dt);
    }

    this.camera.position.copy(this.currentPosition).add(shakeOffset);
    this.camera.lookAt(this.currentLookAt);
  }

  public setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
