/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameConfig } from '../types/game';

export const GAME_CONFIG: GameConfig = {
  physics: {
    fixedTimeStep: 1 / 60,
    maxSpeed: 48, // ~173 km/h
    nitroMaxSpeed: 65, // ~234 km/h
    reverseMaxSpeed: 16, // ~58 km/h
    acceleration: 30, // m/s^2
    nitroAcceleration: 55,
    brakeDeceleration: 45,
    naturalDrag: 0.985,
    steerSpeed: 4.2,
    maxSteerAngle: 0.58, // ~33 degrees
    gripCornering: 5.5,
    driftThreshold: 22, // speed threshold to initiate drift on hard turn
    driftFactor: 0.65, // slide angle multiplier
    driftRecoverySpeed: 3.8,
    railBounciness: 0.45,
    carMass: 1200,
    carWidth: 2.2,
    carLength: 4.4,
  },
  camera: {
    distanceBehind: 6.8,
    heightAbove: 2.8,
    lookAheadDistance: 12.0,
    fovMin: 62,
    fovMax: 76,
    fovSpeedFactor: 0.28,
    smoothPositionLambda: 14.0,
    smoothLookAtLambda: 16.0,
    shakeDecay: 7.0,
  },
  track: {
    width: 20.0,
    railHeight: 1.2,
    railRadius: 0.22,
    samplesCount: 500,
    asphaltColor: 0x0a0c14,
    barrierCyanColor: 0x00f0ff,
    barrierMagentaColor: 0xff007f,
  },
  audio: {
    masterVolume: 0.75,
    engineBaseFreq: 65,
    engineMaxFreq: 340,
    musicEnabled: true,
  },
  race: {
    totalLaps: 3,
  },
};
