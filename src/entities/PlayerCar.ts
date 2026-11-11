/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CarBase } from './CarBase';
import { TrackCurve } from '../track/TrackCurve';
import { InputState } from '../types/game';

export class PlayerCar extends CarBase {
  private wheels: THREE.Mesh[] = [];
  private frontWheelsGroup: THREE.Group[] = [];
  private exhaustLights: THREE.PointLight[] = [];
  private exhaustNozzles: THREE.Mesh[] = [];
  private carBodyGroup: THREE.Group = new THREE.Group();

  constructor(trackCurve: TrackCurve, startU: number = 0, lateralOffset: number = 0) {
    super(trackCurve, startU, lateralOffset);
    this.buildModel();
  }

  private buildModel(): void {
    this.mesh.add(this.carBodyGroup);

    // Materials with varied roughness and metalness
    const primaryPaintMat = new THREE.MeshStandardMaterial({
      color: 0x0a101f, // Dark cyber navy hull
      metalness: 0.85,
      roughness: 0.2,
    });

    const trimPaintMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff, // Electric cyan accent
      emissive: 0x00f0ff,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.15,
    });

    const canopyGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x14052b,
      metalness: 0.9,
      roughness: 0.1,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85,
      ior: 1.5,
    });

    const chassisDarkMat = new THREE.MeshStandardMaterial({
      color: 0x11131a,
      metalness: 0.5,
      roughness: 0.7,
    });

    const headlightGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 3.0,
      roughness: 0.1,
    });

    const taillightGlowMat = new THREE.MeshStandardMaterial({
      color: 0xff0055,
      emissive: 0xff0055,
      emissiveIntensity: 3.5,
      roughness: 0.1,
    });

    const wheelRubberMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a24,
      roughness: 0.85,
      metalness: 0.1,
    });

    const wheelRimNeonMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.8,
      metalness: 0.9,
      roughness: 0.1,
    });

    const exhaustNozzleMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff4400,
      emissiveIntensity: 1.5,
      metalness: 0.9,
      roughness: 0.2,
    });

    this.disposables.push(
      primaryPaintMat,
      trimPaintMat,
      canopyGlassMat,
      chassisDarkMat,
      headlightGlowMat,
      taillightGlowMat,
      wheelRubberMat,
      wheelRimNeonMat,
      exhaustNozzleMat
    );

    // 1. Lower Chassis Plate
    const chassisGeo = new THREE.BoxGeometry(1.9, 0.25, 4.2);
    const chassis = new THREE.Mesh(chassisGeo, chassisDarkMat);
    chassis.position.y = 0.25;
    chassis.castShadow = true;
    this.carBodyGroup.add(chassis);
    this.disposables.push(chassisGeo);

    // 2. Primary Upper Hull (Aerodynamic low-poly sports body)
    const hullGeo = new THREE.BoxGeometry(1.85, 0.45, 3.6);
    const hull = new THREE.Mesh(hullGeo, primaryPaintMat);
    hull.position.set(0, 0.5, -0.1);
    hull.castShadow = true;
    this.carBodyGroup.add(hull);
    this.disposables.push(hullGeo);

    // 3. Front Wedge Splitter
    const wedgeGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.35, 3);
    wedgeGeo.rotateY(Math.PI);
    const wedge = new THREE.Mesh(wedgeGeo, primaryPaintMat);
    wedge.position.set(0, 0.32, 1.9);
    wedge.scale.set(1.1, 1, 1.4);
    this.carBodyGroup.add(wedge);
    this.disposables.push(wedgeGeo);

    // 4. Cockpit Canopy (Faceted Jet Fighter Canopy)
    const canopyGeo = new THREE.BoxGeometry(1.2, 0.45, 1.8);
    const canopy = new THREE.Mesh(canopyGeo, canopyGlassMat);
    canopy.position.set(0, 0.88, -0.3);
    this.carBodyGroup.add(canopy);
    this.disposables.push(canopyGeo);

    // 5. Rear Cyber Spoiler Wing
    const wingGeo = new THREE.BoxGeometry(1.95, 0.08, 0.45);
    const wing = new THREE.Mesh(wingGeo, trimPaintMat);
    wing.position.set(0, 1.1, -1.9);
    this.carBodyGroup.add(wing);

    const strutGeo = new THREE.BoxGeometry(0.08, 0.4, 0.2);
    const leftStrut = new THREE.Mesh(strutGeo, chassisDarkMat);
    leftStrut.position.set(-0.7, 0.9, -1.85);
    const rightStrut = new THREE.Mesh(strutGeo, chassisDarkMat);
    rightStrut.position.set(0.7, 0.9, -1.85);
    this.carBodyGroup.add(leftStrut, rightStrut);
    this.disposables.push(wingGeo, strutGeo);

    // 6. Glowing Twin Headlights
    const lightGeo = new THREE.BoxGeometry(0.35, 0.12, 0.15);
    const leftHeadlight = new THREE.Mesh(lightGeo, headlightGlowMat);
    leftHeadlight.position.set(-0.65, 0.42, 2.05);
    const rightHeadlight = new THREE.Mesh(lightGeo, headlightGlowMat);
    rightHeadlight.position.set(0.65, 0.42, 2.05);
    this.carBodyGroup.add(leftHeadlight, rightHeadlight);
    this.disposables.push(lightGeo);

    // Forward Spotlights
    const frontSpot = new THREE.SpotLight(0xe8f4ff, 3.5, 35, Math.PI / 5, 0.4);
    frontSpot.position.set(0, 0.5, 2.2);
    const targetObj = new THREE.Object3D();
    targetObj.position.set(0, 0, 20);
    this.carBodyGroup.add(targetObj);
    frontSpot.target = targetObj;
    this.carBodyGroup.add(frontSpot);

    // 7. Full-Width Glowing Taillight Strip
    const tailGeo = new THREE.BoxGeometry(1.75, 0.12, 0.1);
    const taillight = new THREE.Mesh(tailGeo, taillightGlowMat);
    taillight.position.set(0, 0.55, -2.05);
    this.carBodyGroup.add(taillight);
    this.disposables.push(tailGeo);

    // 8. Dual Reactive Exhaust Thruster Nozzles
    const nozzleGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.35, 8);
    nozzleGeo.rotateX(Math.PI / 2);

    const leftNozzle = new THREE.Mesh(nozzleGeo, exhaustNozzleMat);
    leftNozzle.position.set(-0.45, 0.32, -2.05);
    const rightNozzle = new THREE.Mesh(nozzleGeo, exhaustNozzleMat);
    rightNozzle.position.set(0.45, 0.32, -2.05);
    this.exhaustNozzles.push(leftNozzle, rightNozzle);
    this.carBodyGroup.add(leftNozzle, rightNozzle);
    this.disposables.push(nozzleGeo);

    // Exhaust point light
    const exhaustLight = new THREE.PointLight(0xff4400, 1.2, 8);
    exhaustLight.position.set(0, 0.35, -2.3);
    this.exhaustLights.push(exhaustLight);
    this.carBodyGroup.add(exhaustLight);

    // 9. Wheels & Rims (4 Assemblies)
    const wheelPositions = [
      { x: -1.05, y: 0.34, z: 1.35, isFront: true },  // Front Left
      { x: 1.05, y: 0.34, z: 1.35, isFront: true },   // Front Right
      { x: -1.08, y: 0.36, z: -1.25, isFront: false }, // Rear Left
      { x: 1.08, y: 0.36, z: -1.25, isFront: false },  // Rear Right
    ];

    const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.32, 16);
    tireGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.34, 12);
    rimGeo.rotateZ(Math.PI / 2);
    this.disposables.push(tireGeo, rimGeo);

    for (const wp of wheelPositions) {
      const wheelMountGroup = new THREE.Group();
      wheelMountGroup.position.set(wp.x, wp.y, wp.z);

      const tireMesh = new THREE.Mesh(tireGeo, wheelRubberMat);
      const rimMesh = new THREE.Mesh(rimGeo, wheelRimNeonMat);
      tireMesh.add(rimMesh);
      tireMesh.castShadow = true;

      wheelMountGroup.add(tireMesh);
      this.wheels.push(tireMesh);

      if (wp.isFront) {
        this.frontWheelsGroup.push(wheelMountGroup);
      }

      this.carBodyGroup.add(wheelMountGroup);
    }
  }

  public update(dt: number, input: InputState): void {
    const throttle = input.forward ? 1 : input.backward ? -1 : 0;
    const steer = input.left ? -1 : input.right ? 1 : 0;

    // Use CarBase arcade physics
    this.updatePhysics(dt, throttle, steer, input.handbrake);

    // 1. Wheel Rotation (spin with distance traveled)
    const wheelRotDelta = (this.state.speed * dt) / 0.36;
    for (const wheel of this.wheels) {
      wheel.rotation.x += wheelRotDelta;
    }

    // 2. Front Wheel Steer Angle
    for (const fg of this.frontWheelsGroup) {
      fg.rotation.y = this.state.steerAngle * 0.9;
    }

    // 3. Body roll / lean dynamics into turns
    const targetRoll = -this.state.steerAngle * 0.18 + (this.state.isDrifting ? this.state.driftAngle * 0.2 : 0);
    this.carBodyGroup.rotation.z = THREE.MathUtils.damp(this.carBodyGroup.rotation.z, targetRoll, 10, dt);

    // Pitch dynamics: nose dives on braking, squats on acceleration
    const targetPitch = (throttle > 0 ? 0.05 : throttle < 0 ? -0.06 : 0) * (Math.abs(this.state.speed) / 20);
    this.carBodyGroup.rotation.x = THREE.MathUtils.damp(this.carBodyGroup.rotation.x, targetPitch, 8, dt);

    // 4. Exhaust Intensity
    const exhaustIntensity = this.isNitroActive
      ? 4.5
      : throttle > 0
      ? 1.5 + (this.state.speed / 48) * 1.5
      : 0.3;

    for (const light of this.exhaustLights) {
      light.intensity = exhaustIntensity;
      light.color.setHex(this.isNitroActive ? 0x00f0ff : 0xff4400);
    }

    for (const nozzle of this.exhaustNozzles) {
      const mat = nozzle.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = exhaustIntensity;
      mat.emissive.setHex(this.isNitroActive ? 0x00f0ff : 0xff4400);
    }
  }
}
