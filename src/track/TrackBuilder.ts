/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { TrackCurve } from './TrackCurve';
import { GAME_CONFIG } from '../config/gameConfig';

export class TrackBuilder {
  public group: THREE.Group = new THREE.Group();
  private trackCurve: TrackCurve;
  private roadMesh!: THREE.Mesh;
  private leftRailMesh!: THREE.Mesh;
  private rightRailMesh!: THREE.Mesh;
  private disposables: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];

  constructor(trackCurve: TrackCurve) {
    this.trackCurve = trackCurve;
    this.build();
  }

  private createAsphaltTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // 1. Wet dark asphalt base
    ctx.fillStyle = '#0c0e15';
    ctx.fillRect(0, 0, 512, 1024);

    // 2. Asphalt grain & noise
    const imgData = ctx.getImageData(0, 0, 512, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 14;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise + 2));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise + 5));
    }
    ctx.putImageData(imgData, 0, 0);

    // 3. Subtle wet reflective track sheen
    const sheenGrad = ctx.createLinearGradient(0, 0, 512, 0);
    sheenGrad.addColorStop(0, 'rgba(0, 240, 255, 0.08)');
    sheenGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.03)');
    sheenGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.05)');
    sheenGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.03)');
    sheenGrad.addColorStop(1, 'rgba(255, 0, 127, 0.08)');
    ctx.fillStyle = sheenGrad;
    ctx.fillRect(0, 0, 512, 1024);

    // 4. Outer edge lines
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(16, 0, 10, 1024);
    ctx.fillStyle = '#ff007f';
    ctx.fillRect(512 - 26, 0, 10, 1024);

    // 5. Center dashed line (glowing cyan / white)
    ctx.fillStyle = '#e2f8ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    for (let y = 0; y < 1024; y += 128) {
      ctx.fillRect(250, y + 16, 12, 72);
    }
    ctx.shadowBlur = 0;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 40);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.disposables.push(texture);
    return texture;
  }

  private createBuildingTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark skyscraper facade
    ctx.fillStyle = '#080911';
    ctx.fillRect(0, 0, 256, 512);

    // Windows grid with random neon illumination
    const windowCols = 8;
    const windowRows = 24;
    const padX = 12;
    const padY = 12;
    const w = (256 - padX * (windowCols + 1)) / windowCols;
    const h = (512 - padY * (windowRows + 1)) / windowRows;

    const neonPalettes = ['#00F0FF', '#FF007F', '#FACC15', '#38BDF8', '#818CF8'];

    for (let row = 0; row < windowRows; row++) {
      for (let col = 0; col < windowCols; col++) {
        const x = padX + col * (w + padX);
        const y = padY + row * (h + padY);

        const lit = Math.random() > 0.45;
        if (lit) {
          const color = neonPalettes[Math.floor(Math.random() * neonPalettes.length)];
          ctx.fillStyle = color;
          ctx.globalAlpha = Math.random() * 0.7 + 0.3;
          ctx.fillRect(x, y, w, h);
        } else {
          ctx.fillStyle = '#111320';
          ctx.globalAlpha = 0.8;
          ctx.fillRect(x, y, w, h);
        }
      }
    }
    ctx.globalAlpha = 1.0;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.disposables.push(texture);
    return texture;
  }

  private build(): void {
    const samples = this.trackCurve.samples;
    const sampleCount = samples.length;
    const halfWidth = GAME_CONFIG.track.width / 2;

    // 1. Build Road Surface Ribbon Mesh
    const roadVertices: number[] = [];
    const roadNormals: number[] = [];
    const roadUvs: number[] = [];
    const roadIndices: number[] = [];

    for (let i = 0; i <= sampleCount; i++) {
      const idx = i % sampleCount;
      const sample = samples[idx];
      const p = sample.position;
      const binormal = sample.binormal;
      const normal = sample.normal;

      // Left vertex
      const leftPos = new THREE.Vector3().copy(p).addScaledVector(binormal, -halfWidth);
      // Right vertex
      const rightPos = new THREE.Vector3().copy(p).addScaledVector(binormal, halfWidth);

      roadVertices.push(leftPos.x, leftPos.y, leftPos.z);
      roadVertices.push(rightPos.x, rightPos.y, rightPos.z);

      roadNormals.push(normal.x, normal.y, normal.z);
      roadNormals.push(normal.x, normal.y, normal.z);

      const v = i / sampleCount;
      roadUvs.push(0, v * 50);
      roadUvs.push(1, v * 50);

      if (i < sampleCount) {
        const base = i * 2;
        // Two triangles per segment
        roadIndices.push(base, base + 1, base + 2);
        roadIndices.push(base + 1, base + 3, base + 2);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
    roadGeo.setIndex(roadIndices);

    const roadMat = new THREE.MeshStandardMaterial({
      map: this.createAsphaltTexture(),
      roughness: 0.35,
      metalness: 0.45,
      side: THREE.DoubleSide,
    });

    this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
    this.roadMesh.receiveShadow = true;
    this.group.add(this.roadMesh);
    this.disposables.push(roadGeo, roadMat);

    // 2. Build Glowing Edge Rails
    this.buildRails();

    // 3. Build Start / Finish Arch & Gantry
    this.buildGantry();

    // 4. Build Procedural City Skyline
    this.buildCitySkyline();

    // 5. Build Ground Terrain Grid
    this.buildGroundGrid();
  }

  private buildRails(): void {
    const samples = this.trackCurve.samples;
    const halfWidth = GAME_CONFIG.track.width / 2;
    const railHeight = GAME_CONFIG.track.railHeight;

    const leftRailPoints: THREE.Vector3[] = [];
    const rightRailPoints: THREE.Vector3[] = [];

    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const leftP = new THREE.Vector3()
        .copy(s.position)
        .addScaledVector(s.binormal, -(halfWidth + 0.3))
        .addScaledVector(s.normal, railHeight);

      const rightP = new THREE.Vector3()
        .copy(s.position)
        .addScaledVector(s.binormal, halfWidth + 0.3)
        .addScaledVector(s.normal, railHeight);

      leftRailPoints.push(leftP);
      rightRailPoints.push(rightP);
    }

    const leftRailCurve = new THREE.CatmullRomCurve3(leftRailPoints, true);
    const rightRailCurve = new THREE.CatmullRomCurve3(rightRailPoints, true);

    const railGeoLeft = new THREE.TubeGeometry(leftRailCurve, 300, GAME_CONFIG.track.railRadius, 8, true);
    const railGeoRight = new THREE.TubeGeometry(rightRailCurve, 300, GAME_CONFIG.track.railRadius, 8, true);

    const cyanMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0.8,
    });

    const magentaMat = new THREE.MeshStandardMaterial({
      color: 0xff007f,
      emissive: 0xff007f,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0.8,
    });

    this.leftRailMesh = new THREE.Mesh(railGeoLeft, cyanMat);
    this.rightRailMesh = new THREE.Mesh(railGeoRight, magentaMat);

    this.group.add(this.leftRailMesh);
    this.group.add(this.rightRailMesh);

    this.disposables.push(railGeoLeft, railGeoRight, cyanMat, magentaMat);

    // Build periodic barrier posts
    this.buildBarrierPosts(leftRailPoints, rightRailPoints, cyanMat, magentaMat);
  }

  private buildBarrierPosts(
    leftPoints: THREE.Vector3[],
    rightPoints: THREE.Vector3[],
    cyanMat: THREE.Material,
    magentaMat: THREE.Material
  ): void {
    const postGeo = new THREE.CylinderGeometry(0.08, 0.1, GAME_CONFIG.track.railHeight, 6);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x222638,
      metalness: 0.8,
      roughness: 0.3,
    });
    this.disposables.push(postGeo, postMat);

    const step = 8; // Post every 8 sample points
    for (let i = 0; i < leftPoints.length; i += step) {
      const leftTop = leftPoints[i];
      const rightTop = rightPoints[i];

      // Left post
      const leftPost = new THREE.Mesh(postGeo, postMat);
      leftPost.position.copy(leftTop);
      leftPost.position.y -= GAME_CONFIG.track.railHeight / 2;
      this.group.add(leftPost);

      // Right post
      const rightPost = new THREE.Mesh(postGeo, postMat);
      rightPost.position.copy(rightTop);
      rightPost.position.y -= GAME_CONFIG.track.railHeight / 2;
      this.group.add(rightPost);
    }
  }

  private buildGantry(): void {
    // Start / Finish Line arch gantry at track point 0
    const startSample = this.trackCurve.samples[0];
    const halfWidth = GAME_CONFIG.track.width / 2 + 1.2;
    const height = 9.0;

    const gantryGroup = new THREE.Group();
    gantryGroup.position.copy(startSample.position);

    // Orient gantry along track tangent
    const lookTarget = new THREE.Vector3().copy(startSample.position).add(startSample.tangent);
    gantryGroup.lookAt(lookTarget);

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x1c2132,
      metalness: 0.9,
      roughness: 0.2,
    });

    const neonHeaderMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 2.0,
      roughness: 0.1,
    });

    // Left pillar
    const pillarGeo = new THREE.BoxGeometry(0.8, height, 0.8);
    const leftPillar = new THREE.Mesh(pillarGeo, metalMat);
    leftPillar.position.set(-halfWidth, height / 2, 0);
    gantryGroup.add(leftPillar);

    // Right pillar
    const rightPillar = new THREE.Mesh(pillarGeo, metalMat);
    rightPillar.position.set(halfWidth, height / 2, 0);
    gantryGroup.add(rightPillar);

    // Cross beam
    const beamGeo = new THREE.BoxGeometry(halfWidth * 2 + 1.6, 1.2, 1.4);
    const crossBeam = new THREE.Mesh(beamGeo, metalMat);
    crossBeam.position.set(0, height, 0);
    gantryGroup.add(crossBeam);

    // Neon signage box
    const signGeo = new THREE.BoxGeometry(halfWidth * 1.5, 0.7, 1.5);
    const sign = new THREE.Mesh(signGeo, neonHeaderMat);
    sign.position.set(0, height - 0.2, 0);
    gantryGroup.add(sign);

    this.group.add(gantryGroup);
    this.disposables.push(pillarGeo, beamGeo, signGeo, metalMat, neonHeaderMat);
  }

  private buildCitySkyline(): void {
    const bldgTexture = this.createBuildingTexture();
    const bldgMat = new THREE.MeshStandardMaterial({
      map: bldgTexture,
      roughness: 0.4,
      metalness: 0.6,
    });
    this.disposables.push(bldgMat);

    // Generate clusters of procedural skyscrapers surrounding the track
    const buildingCount = 75;
    const rng = (min: number, max: number) => min + Math.random() * (max - min);

    for (let i = 0; i < buildingCount; i++) {
      // Pick a random track point as anchor
      const sampleIdx = Math.floor(Math.random() * this.trackCurve.samples.length);
      const sample = this.trackCurve.samples[sampleIdx];

      // Place building at an offset distance from the track (35m to 180m away)
      const side = Math.random() > 0.5 ? 1 : -1;
      const offsetDist = rng(32, 160);
      const pos = new THREE.Vector3()
        .copy(sample.position)
        .addScaledVector(sample.binormal, side * offsetDist)
        .addScaledVector(sample.tangent, rng(-25, 25));

      const w = rng(18, 45);
      const d = rng(18, 45);
      const h = rng(45, 140);

      const bldgGeo = new THREE.BoxGeometry(w, h, d);
      const building = new THREE.Mesh(bldgGeo, bldgMat);
      building.position.set(pos.x, h / 2 - 2, pos.z);
      building.castShadow = true;
      building.receiveShadow = true;
      this.group.add(building);
      this.disposables.push(bldgGeo);

      // Add neon spire or beacon on top of taller buildings
      if (h > 90) {
        const spireGeo = new THREE.CylinderGeometry(0.2, 0.8, 16, 6);
        const spireMat = new THREE.MeshStandardMaterial({
          color: Math.random() > 0.5 ? 0x00f0ff : 0xff007f,
          emissive: Math.random() > 0.5 ? 0x00f0ff : 0xff007f,
          emissiveIntensity: 2.5,
        });
        const spire = new THREE.Mesh(spireGeo, spireMat);
        spire.position.set(pos.x, h + 8, pos.z);
        this.group.add(spire);
        this.disposables.push(spireGeo, spireMat);
      }
    }
  }

  private buildGroundGrid(): void {
    // Massive dark ground plane under city
    const groundGeo = new THREE.PlaneGeometry(1200, 1200, 20, 20);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x04050b,
      roughness: 0.9,
      metalness: 0.1,
    });
    groundGeo.rotateX(-Math.PI / 2);
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.y = -0.5;
    groundMesh.receiveShadow = true;
    this.group.add(groundMesh);
    this.disposables.push(groundGeo, groundMat);

    // Subtle neon grid lines overlay
    const gridHelper = new THREE.GridHelper(1200, 60, 0x00f0ff, 0x111628);
    gridHelper.position.y = -0.48;
    this.group.add(gridHelper);
    this.disposables.push(gridHelper.geometry, gridHelper.material as THREE.Material);
  }

  public dispose(): void {
    for (const item of this.disposables) {
      item.dispose();
    }
    this.group.clear();
  }
}
