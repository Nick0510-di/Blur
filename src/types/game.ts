/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export type PowerUpType = 'nitro' | 'shunt' | 'mine' | 'shock' | 'repair';

export interface PowerUpSlot {
  type: PowerUpType;
  name: string;
  color: string;
  icon: string;
  isReady: boolean;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  handbrake: boolean;
  powerup: boolean;
}

export interface CarPhysicsState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  direction: THREE.Vector3;
  up: THREE.Vector3;
  speed: number;
  steerAngle: number;
  driftAngle: number;
  isDrifting: boolean;
  health: number;
  maxHealth: number;
  trackProgress: number; // 0 to 1 along circuit spline
  lap: number;
  currentLapTime: number;
  bestLapTime: number | null;
  lapStartTime: number;
  isFinished: boolean;
}

export interface TrackPoint {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  binormal: THREE.Vector3;
  distance: number;
  u: number;
}

export interface ClosestTrackProjection {
  u: number;
  point: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  binormal: THREE.Vector3;
  distanceToCenter: number;
  lateralOffset: number; // negative = left, positive = right
}

export interface GameConfig {
  physics: {
    fixedTimeStep: number;
    maxSpeed: number; // m/s (~180 km/h)
    nitroMaxSpeed: number; // m/s (~240 km/h)
    reverseMaxSpeed: number;
    acceleration: number;
    nitroAcceleration: number;
    brakeDeceleration: number;
    naturalDrag: number;
    steerSpeed: number;
    maxSteerAngle: number;
    gripCornering: number;
    driftThreshold: number;
    driftFactor: number;
    driftRecoverySpeed: number;
    railBounciness: number;
    carMass: number;
    carWidth: number;
    carLength: number;
  };
  camera: {
    distanceBehind: number;
    heightAbove: number;
    lookAheadDistance: number;
    fovMin: number;
    fovMax: number;
    fovSpeedFactor: number;
    smoothPositionLambda: number;
    smoothLookAtLambda: number;
    shakeDecay: number;
  };
  track: {
    width: number;
    railHeight: number;
    railRadius: number;
    samplesCount: number;
    asphaltColor: number;
    barrierCyanColor: number;
    barrierMagentaColor: number;
  };
  audio: {
    masterVolume: number;
    engineBaseFreq: number;
    engineMaxFreq: number;
    musicEnabled: boolean;
  };
  race: {
    totalLaps: number;
  };
}

export interface RaceTelemetry {
  speedKmh: number;
  speedPercent: number;
  lap: number;
  maxLaps: number;
  lapProgress: number;
  currentLapTime: number;
  bestLapTime: number | null;
  lastLapTime: number | null;
  position: number;
  totalRacers: number;
  health: number;
  maxHealth: number;
  isDrifting: boolean;
  activePowerUp: PowerUpType | null;
  powerUpSlots: PowerUpSlot[];
  isFinished: boolean;
}
