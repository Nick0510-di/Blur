/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CarPhysicsState, ClosestTrackProjection, PowerUpType, PowerUpSlot } from '../types/game';
import { GAME_CONFIG } from '../config/gameConfig';
import { TrackCurve } from '../track/TrackCurve';

export class CarBase {
  public mesh: THREE.Group = new THREE.Group();
  public trackCurve: TrackCurve;
  public state: CarPhysicsState;
  public powerUpSlots: PowerUpSlot[] = [
    { type: 'nitro', name: 'Nitro', color: '#FACC15', icon: 'zap', isReady: false },
    { type: 'shunt', name: 'Shunt', color: '#10B981', icon: 'crosshair', isReady: false },
    { type: 'mine', name: 'Mine', color: '#EF4444', icon: 'disc', isReady: false },
    { type: 'shock', name: 'Shock', color: '#3B82F6', icon: 'activity', isReady: false },
    { type: 'repair', name: 'Repair', color: '#F8FAFC', icon: 'shield', isReady: false },
  ];
  public activePowerUp: PowerUpType | null = null;
  public isNitroActive: boolean = false;
  public nitroTimer: number = 0;

  protected disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
  protected lastProjection: ClosestTrackProjection | null = null;
  protected lastU: number = 0;

  // Reusable math objects to eliminate render-loop GC
  protected _forward = new THREE.Vector3();
  protected _right = new THREE.Vector3();
  protected _up = new THREE.Vector3(0, 1, 0);
  protected _tempVec = new THREE.Vector3();

  constructor(trackCurve: TrackCurve, startU: number = 0, lateralOffset: number = 0) {
    this.trackCurve = trackCurve;

    const startSample = trackCurve.getPointAt(startU);
    const startTangent = trackCurve.getTangentAt(startU);
    const startBinormal = new THREE.Vector3().crossVectors(startTangent, this._up).normalize();

    const initialPos = new THREE.Vector3()
      .copy(startSample)
      .addScaledVector(startBinormal, lateralOffset);
    initialPos.y += 0.4; // Flush onto track

    this.state = {
      position: initialPos.clone(),
      velocity: new THREE.Vector3(),
      direction: startTangent.clone().normalize(),
      up: new THREE.Vector3(0, 1, 0),
      speed: 0,
      steerAngle: 0,
      driftAngle: 0,
      isDrifting: false,
      health: 100,
      maxHealth: 100,
      trackProgress: startU,
      lap: 1,
      currentLapTime: 0,
      bestLapTime: null,
      lapStartTime: performance.now() / 1000,
      isFinished: false,
    };

    this.lastU = startU;
    this.mesh.position.copy(this.state.position);
    this.mesh.lookAt(new THREE.Vector3().addVectors(this.state.position, this.state.direction));
  }

  public updatePhysics(
    dt: number,
    throttle: number, // -1 to 1 (negative = brake/reverse, positive = accelerate)
    steerInput: number, // -1 to 1 (negative = left, positive = right)
    handbrake: boolean = false
  ): void {
    const pCfg = GAME_CONFIG.physics;

    // 1. Nitro booster countdown
    if (this.isNitroActive) {
      this.nitroTimer -= dt;
      if (this.nitroTimer <= 0) {
        this.isNitroActive = false;
      }
    }

    const currentMaxSpeed = this.isNitroActive ? pCfg.nitroMaxSpeed : pCfg.maxSpeed;
    const currentAccel = this.isNitroActive ? pCfg.nitroAcceleration : pCfg.acceleration;

    // 2. Longitudinal acceleration & braking
    if (throttle > 0) {
      if (this.state.speed < 0) {
        // Active braking from reverse
        this.state.speed += pCfg.brakeDeceleration * dt;
        if (this.state.speed > 0) this.state.speed = 0;
      } else {
        // Forward drive
        this.state.speed += throttle * currentAccel * dt;
        if (this.state.speed > currentMaxSpeed) {
          this.state.speed = currentMaxSpeed;
        }
      }
    } else if (throttle < 0) {
      if (this.state.speed > 0) {
        // Active braking from forward
        this.state.speed -= Math.abs(throttle) * pCfg.brakeDeceleration * dt;
        if (this.state.speed < 0) this.state.speed = 0;
      } else {
        // Reverse drive
        this.state.speed -= Math.abs(throttle) * pCfg.acceleration * 0.5 * dt;
        if (this.state.speed < -pCfg.reverseMaxSpeed) {
          this.state.speed = -pCfg.reverseMaxSpeed;
        }
      }
    } else {
      // Natural rolling resistance and aerodynamic drag
      this.state.speed *= Math.pow(pCfg.naturalDrag, dt * 60);
      if (Math.abs(this.state.speed) < 0.1) {
        this.state.speed = 0;
      }
    }

    // 3. Steering & Drift Dynamics
    const targetSteerAngle = -steerInput * pCfg.maxSteerAngle;
    this.state.steerAngle = THREE.MathUtils.damp(
      this.state.steerAngle,
      targetSteerAngle,
      pCfg.steerSpeed,
      dt
    );

    // Turn rate scales with speed to prevent pivoting at standstill
    const speedRatio = Math.min(1.0, Math.abs(this.state.speed) / 10.0);
    const yawDelta = this.state.steerAngle * speedRatio * pCfg.gripCornering * dt;

    // Check drift initiation (hard steering at high speed or handbrake)
    const wantsDrift =
      handbrake ||
      (Math.abs(this.state.speed) > pCfg.driftThreshold && Math.abs(steerInput) > 0.65);

    if (wantsDrift && Math.abs(this.state.speed) > 12) {
      this.state.isDrifting = true;
      const targetDrift = -steerInput * (pCfg.maxSteerAngle * pCfg.driftFactor);
      this.state.driftAngle = THREE.MathUtils.damp(
        this.state.driftAngle,
        targetDrift,
        pCfg.driftRecoverySpeed * 0.7,
        dt
      );
    } else {
      this.state.isDrifting = false;
      this.state.driftAngle = THREE.MathUtils.damp(
        this.state.driftAngle,
        0,
        pCfg.driftRecoverySpeed,
        dt
      );
    }

    // Rotate heading direction
    const rotQuat = new THREE.Quaternion().setFromAxisAngle(this.state.up, yawDelta);
    this.state.direction.applyQuaternion(rotQuat).normalize();

    // 4. Calculate actual velocity vector with drift slide
    this._right.crossVectors(this.state.direction, this.state.up).normalize();

    // Visual heading accounts for drift angle
    const totalHeading = this.state.direction.clone();
    if (Math.abs(this.state.driftAngle) > 0.01) {
      const driftQuat = new THREE.Quaternion().setFromAxisAngle(this.state.up, this.state.driftAngle);
      totalHeading.applyQuaternion(driftQuat).normalize();
    }

    // Velocity combines forward travel and slight sideways drift slide
    this.state.velocity.copy(this.state.direction).multiplyScalar(this.state.speed);
    if (this.state.isDrifting) {
      const lateralSlide = -Math.sign(this.state.driftAngle) * Math.abs(this.state.speed) * 0.22;
      this.state.velocity.addScaledVector(this._right, lateralSlide);
    }

    // Advance position
    this.state.position.addScaledVector(this.state.velocity, dt);

    // 5. Track Constrainment & Rail Collision Handling
    this.handleTrackCollisions(dt);

    // 6. Update mesh transform
    this.mesh.position.copy(this.state.position);
    this._tempVec.addVectors(this.state.position, totalHeading);
    this.mesh.lookAt(this._tempVec);

    // 7. Lap & Progress Tracking
    this.updateLapProgression();
  }

  protected handleTrackCollisions(dt: number): void {
    const proj = this.trackCurve.findClosestProjection(this.state.position);
    this.lastProjection = proj;

    // Track surface elevation adhesion (glue car flush to asphalt)
    const surfaceHeight = proj.point.y + 0.35;
    this.state.position.y = THREE.MathUtils.damp(this.state.position.y, surfaceHeight, 18, dt);
    this.state.up.copy(proj.normal);

    // Guard rails collision check
    const maxOffset = GAME_CONFIG.track.width / 2 - GAME_CONFIG.physics.carWidth / 2 - 0.2;
    if (Math.abs(proj.lateralOffset) > maxOffset) {
      // Car struck outer neon barrier rail!
      const penetration = Math.abs(proj.lateralOffset) - maxOffset;
      const pushDir = proj.lateralOffset > 0 ? -1 : 1;

      // Push back onto track
      this.state.position.addScaledVector(proj.binormal, pushDir * penetration * 1.1);

      // Bounce velocity & reduce speed
      this.state.speed *= GAME_CONFIG.physics.railBounciness;

      // Small damage
      this.applyDamage(2);
    }
  }

  protected updateLapProgression(): void {
    if (!this.lastProjection) return;

    const currentU = this.lastProjection.u;
    this.state.trackProgress = currentU;

    // Detect lap completion: wrapped from > 0.85 to < 0.15
    if (this.lastU > 0.85 && currentU < 0.15 && this.state.speed > 5) {
      const now = performance.now() / 1000;
      const lapTime = now - this.state.lapStartTime;
      this.state.currentLapTime = lapTime;

      if (this.state.bestLapTime === null || lapTime < this.state.bestLapTime) {
        this.state.bestLapTime = lapTime;
      }

      this.state.lapStartTime = now;
      this.state.lap += 1;

      if (this.state.lap > GAME_CONFIG.race.totalLaps) {
        this.state.isFinished = true;
      }
    }

    this.lastU = currentU;
  }

  public applyDamage(amount: number): void {
    this.state.health = Math.max(0, this.state.health - amount);
  }

  public repair(amount: number): void {
    this.state.health = Math.min(this.state.maxHealth, this.state.health + amount);
  }

  public triggerNitro(duration: number = 3.5): void {
    this.isNitroActive = true;
    this.nitroTimer = duration;
  }

  public dispose(): void {
    for (const item of this.disposables) {
      item.dispose();
    }
    this.mesh.clear();
  }
}
