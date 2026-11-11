/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { TrackPoint, ClosestTrackProjection } from '../types/game';

export class TrackCurve {
  public curve: THREE.CatmullRomCurve3;
  public totalLength: number;
  public samples: TrackPoint[] = [];
  private sampleCount: number;

  constructor(sampleCount: number = 600) {
    this.sampleCount = sampleCount;

    // Control points for a fast, flowing cyber-racer circuit
    // Includes high-speed straights, gentle elevation undulations, a chicane, and a sweeping hairpin
    const controlPoints: THREE.Vector3[] = [
      new THREE.Vector3(0, 0, 0),          // 0: Start / Finish Line
      new THREE.Vector3(0, 0, 140),        // 1: Main Straight high speed
      new THREE.Vector3(30, 4, 230),       // 2: Slight rise and gentle right bend
      new THREE.Vector3(90, 8, 290),       // 3: Sweeping high-speed right corner
      new THREE.Vector3(180, 10, 270),     // 4: Elevated highway section
      new THREE.Vector3(240, 6, 210),      // 5: Downward right bend
      new THREE.Vector3(260, 2, 120),      // 6: Straight descent
      new THREE.Vector3(240, 0, 40),       // 7: Chicane entry (left)
      new THREE.Vector3(275, 1, -40),      // 8: Chicane flick (right)
      new THREE.Vector3(250, 0, -130),     // 9: Chicane exit
      new THREE.Vector3(170, 4, -200),     // 10: Back-stretch curve
      new THREE.Vector3(60, 7, -240),      // 11: Long elevated back-straight
      new THREE.Vector3(-60, 5, -250),     // 12: High-speed back-straight
      new THREE.Vector3(-160, 2, -210),    // 13: Entry to sweeping hairpin
      new THREE.Vector3(-210, 0, -120),    // 14: Hairpin midpoint
      new THREE.Vector3(-180, 0, -20),     // 15: Hairpin exit
      new THREE.Vector3(-110, 0, 30),      // 16: Gentle S-bend towards straight
      new THREE.Vector3(-40, 0, -20),      // 17: Alignment onto start-straight
    ];

    this.curve = new THREE.CatmullRomCurve3(controlPoints, true, 'centripetal', 0.5);
    this.totalLength = this.curve.getLength();
    this.precomputeSamples();
  }

  private precomputeSamples(): void {
    this.samples = [];
    const upVector = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < this.sampleCount; i++) {
      const u = i / this.sampleCount;
      const position = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();

      // Compute binormal (sideways across track) and normal (upwards)
      const binormal = new THREE.Vector3().crossVectors(tangent, upVector).normalize();
      const normal = new THREE.Vector3().crossVectors(binormal, tangent).normalize();

      const distance = u * this.totalLength;

      this.samples.push({
        position,
        tangent,
        normal,
        binormal,
        distance,
        u,
      });
    }
  }

  public getPointAt(u: number): THREE.Vector3 {
    const wrappedU = ((u % 1) + 1) % 1;
    return this.curve.getPointAt(wrappedU);
  }

  public getTangentAt(u: number): THREE.Vector3 {
    const wrappedU = ((u % 1) + 1) % 1;
    return this.curve.getTangentAt(wrappedU).normalize();
  }

  /**
   * Fast spatial projection finding closest track centerline point
   */
  public findClosestProjection(position: THREE.Vector3): ClosestTrackProjection {
    let closestIndex = 0;
    let minDistanceSq = Infinity;

    // 1. Coarse search over precomputed samples
    for (let i = 0; i < this.samples.length; i++) {
      const dSq = position.distanceToSquared(this.samples[i].position);
      if (dSq < minDistanceSq) {
        minDistanceSq = dSq;
        closestIndex = i;
      }
    }

    const sample = this.samples[closestIndex];
    // Calculate lateral offset from track centerline
    const delta = new THREE.Vector3().subVectors(position, sample.position);
    // Project delta onto binormal
    const lateralOffset = delta.dot(sample.binormal);

    return {
      u: sample.u,
      point: sample.position.clone(),
      tangent: sample.tangent.clone(),
      normal: sample.normal.clone(),
      binormal: sample.binormal.clone(),
      distanceToCenter: Math.sqrt(minDistanceSq),
      lateralOffset,
    };
  }
}
