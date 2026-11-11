# NEON CLASH - Arcade Vehicular Combat Racer

NEON CLASH is a high-octane 3D arcade vehicular combat racer built with TypeScript and Three.js, featuring procedural low-poly cyber-vehicles, glowing track barriers, procedural synthwave audio synthesis, and tactical power-ups. This plan establishes the end-to-end architecture across 4 milestone stages, specifying the immediate Stage 1 execution scope.

## User Review & Critical Decisions

> [!IMPORTANT]
> The development is structured into 4 sequential stages. Per your instructions, **only Stage 1 will be built first**, and we will pause for your review and approval after each stage before advancing to the next.

- **Confirmed Driving Dynamics**: Responsive arcade grip with smooth automatic drift angle on hard turns, snappy recovery, and zero clunky skidding.
- **Confirmed Audio Direction**: Procedural Web Audio synthesizer generating dynamic synthwave basslines and arpeggios that tempo-shift with car speed, alongside pitch-modulated engine harmonics and combat sound effects.
- **Confirmed Scenery Backdrop**: Midnight cyberpunk metropolis featuring procedural glowing skyscrapers, illuminated neon highway overpasses, and wet reflective asphalt.
- **Confirmed Staging Gate**: Stage 1 (closed loop track, player car physics, chase camera with speed FOV, bloom/effects, engine audio, HUD) $\rightarrow$ **Stop & Approval** $\rightarrow$ Stage 2 $\rightarrow$ Stage 3 $\rightarrow$ Stage 4.

---

## 1. Overview & Core Concept

- **What It Does**: Puts the player in the cockpit of an agile, low-poly neon combat vehicle tearing through a closed-loop night circuit. Players experience snappy arcade steering, dynamic drift mechanics, speed-responsive chase cameras, and tactical vehicular combat.
- **Target Experience**: Fast-paced, arcade racing nostalgia in the spirit of classic combat racers (WipEout, Blur, Rollcage), running at 60 FPS directly in any modern browser without external assets.
- **Key Value**: Zero asset loading latency (100% procedural models, canvas textures, and Web Audio synthesis), clean TypeScript interfaces, and a centralized tuning configuration object for rapid balancing.

---

## 2. User Experience & Visual Design

### Visual Identity & Theme
- **Atmosphere & Skybox**: Deep obsidian-indigo sky (`#050515`) blending into purple horizon fog (`#0c0824`) for atmospheric depth.
- **Wet Asphalt & Neon Edges**: High-specular dark road surface (`#11131a`) flanked by glowing dual-rail neon barriers (electric cyan `#00F0FF` and hot magenta `#FF007F`).
- **Lighting & Post-Processing**: Directional key light with soft shadow mapping, cool hemisphere fill, and `UnrealBloomPass` (or custom bloom compositor pass) with subtle speed-dependent edge chromatic aberration and camera shake.
- **Speed Effects**: FOV widens dynamically from $60^\circ$ to $78^\circ$ under high velocity; radial screen-edge motion streaks and light camera shudder during nitro and hard drifts.

### HUD & UI Design
- **Top Header Bar**: Minimalist, floating unobtrusive telemetry showing Race Position (`1/1` in Stage 1, `1/6` in Stage 3), Current Lap (`1/3`), and Lap Timer (`font-mono tabular-nums`).
- **Bottom Semicircle Power-Up Dock**:
  - Distinct 5-slot radial arc centered at the bottom of the screen.
  - Color-coded power-up rings: Nitro (Yellow `#FACC15`), Shunt (Emerald Green `#10B981`), Mine (Crimson Red `#EF4444`), Shock (Electric Blue `#3B82F6`), Repair (Crisp White `#F8FAFC`).
  - Active power-up slot glowing with ready state indicator, keyed to `[SPACEBAR]`.
- **Digital Speedometer**: Centered above the power-up arc with speed gauge bar and digital KM/H readout.
- **Typography**: Angular high-speed geometric headers (`Orbitron` / `Chakra Petch`) paired with `Plus Jakarta Sans` for clean, unboxed UI labels.

---

## 3. Key Product Decisions & Trade-Offs

- **Procedural Geometry vs. External Models**:
  - *Chosen Approach*: 100% procedural low-poly vehicles assembled as a multi-part `THREE.Group` (chassis, cockpit canopy, glowing headlights, neon taillight strips, wheel hubs, exhaust nozzles).
  - *Why*: Guarantees instant load times, zero broken 404 assets, pristine edge geometry, and dynamic material emission control.
- **Track Generation via Catmull-Rom Splines**:
  - *Chosen Approach*: Closed 3D `CatmullRomCurve3` with extruding ribbon geometry for the asphalt, elevated banking, and extruded neon tube barriers on both rails.
  - *Why*: Allows continuous mathematical query of track position, tangent, normal, curve progression ($t \in [0, 1]$), collision bounds, and AI waypoint navigation.
- **Deterministic Fixed-Timestep Physics Loop**:
  - *Chosen Approach*: Decoupled physics step (fixed 60 Hz accumulator) separated from the variable `requestAnimationFrame` render loop.
  - *Why*: Prevents physics tunneling at high speeds and ensures identical car handling regardless of screen refresh rate (60Hz, 120Hz, or 144Hz).
- **Procedural Web Audio Engine**:
  - *Chosen Approach*: Web Audio API `AudioContext` with custom oscillator banks for dual-tone engine revving (sine + saw waves modulated by RPM), noise buffers for tire screech, and synthesizer nodes for ambient racing synthwave.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                               App.tsx                                  │
│       (WebGL Container, HUD Overlay, Game State Manager, Input)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    ▼                               ▼                               ▼
┌──────────────────┐    ┌──────────────────────┐    ┌────────────────────┐
│ /src/core        │    │ /src/track           │    │ /src/audio         │
│ - Engine.ts      │    │ - TrackCurve.ts      │    │ - SoundManager.ts  │
│ - InputManager.ts│    │ - TrackBuilder.ts    │    │ - SynthEngine.ts   │
│ - ChaseCamera.ts │    │ - TrackMesh.ts       │    │ - MusicSynth.ts    │
└────────┬─────────┘    └──────────┬───────────┘    └────────────────────┘
         │                         │
         ▼                         ▼
┌──────────────────┐    ┌──────────────────────┐    ┌────────────────────┐
│ /src/entities    │    │ /src/effects         │    │ /src/config        │
│ - CarBase.ts     │    │ - ParticleSystem.ts  │    │ - gameConfig.ts    │
│ - PlayerCar.ts   │    │ - SpeedFX.ts         │    │   (All tuning &    │
│ - AICar.ts       │    │ - PostProcess.ts     │    │    physics values) │
│ - PowerUp.ts     │    └──────────────────────┘    └────────────────────┘
│ - Projectile.ts  │
└──────────────────┘
```

### Modular Directory Structure
- `/src/config/gameConfig.ts`: Strongly-typed configuration defining top speed, acceleration, brake friction, steer speed, drift factor, camera offsets, bloom settings, and track parameters.
- `/src/types/game.ts`: Enums and interfaces (`CarState`, `PowerUpType`, `TrackPoint`, `InputState`, `LapProgress`, `RaceResult`).
- `/src/core/`:
  - `Engine.ts`: Initializes Three.js renderer, scene, lights, clock, and runs the fixed-timestep loop.
  - `InputManager.ts`: Captures WASD, Arrow keys, Space, and touch events without layout jank.
  - `ChaseCamera.ts`: Smoothly tracks car rear, dampens rotation, and calculates dynamic speed-based FOV and nitro shake.
- `/src/track/`:
  - `TrackCurve.ts`: Closed loop 3D spline with long straights, sweeping curves, and gentle elevation changes.
  - `TrackBuilder.ts`: Procedurally extrudes road mesh, zebra curbings, glowing cyan/magenta barrier rails, and city skyline buildings.
- `/src/entities/`:
  - `CarBase.ts`: Core physics (velocity, steering angle, drift vector, collision, health).
  - `PlayerCar.ts`: Player input binding and visual tilt/wheel roll animations.
- `/src/audio/`:
  - `SoundManager.ts`: Master audio controller, user-gesture unlock, Web Audio oscillator engine synthesizer, and background synthwave arpeggio generator.
- `/src/ui/`:
  - `HUD.tsx`: React overlay rendering the top race metrics (lap, position, speed) and bottom semicircle power-up arc dock.

---

## 5. Development Stages & Milestones

### **Stage 1 (Immediate Build Target)**
1. **Dependencies & Setup**: Install `three` and `@types/three`. Ensure clean TypeScript compilation and dev server setup.
2. **Game Config & Types**: Create `src/types/game.ts` and `src/config/gameConfig.ts` with comprehensive tuning values.
3. **Procedural Track & Neon City**:
   - Closed-loop circuit with sweeping chicanes and high-speed straights.
   - Dual-color neon light strips (cyan & magenta).
   - Cyberpunk city backdrop with glowing skyscraper silhouettes and night fog.
4. **Player Car & Arcade Handling**:
   - Multi-part low-poly cyber-car with glowing headlights and taillights.
   - Responsive acceleration, braking, reverse, and smooth automatic drift on hard turns.
   - Ground projection and track alignment keeping the car glued to the road surface.
5. **Chase Camera & Visual Effects**:
   - Smooth third-person follow camera with speed-responsive FOV.
   - Post-processing bloom and speed line effects.
6. **Web Audio Engine**:
   - Speed-pitch modulated engine audio synthesis with start/stop on user interaction.
7. **HUD**:
   - Top speed readout, lap time, and empty semicircle power-up slots ready for Stage 2.
8. **Verification & Pause**: Ensure 60 FPS performance, verified compilation, and stop for user review and approval.

### **Stage 2 (Next Milestone - Pending Stage 1 Approval)**
- Floating, rotating 3D power-up pickups placed procedurally along the track spline.
- Implement the 5 power-up types: Nitro (flame exhaust boost), Shunt (homing forward energy blast), Mine (proximity explosive drop), Shock (EMP disruption field), and Repair (nanite healing).
- Particle systems for nitro thrusters, shock waves, and fire explosions.

### **Stage 3 (Subsequent Milestone)**
- 5 AI opponent racers using spline waypoint tracking and dynamic avoidance.
- Race position determination algorithm based on spline progression distance.
- Countdown start sequence (3-2-1-GO) and complete finish podium results with "Play Again" restart.

### **Stage 4 (Final Polish Milestone)**
- On-screen touch controls for mobile devices (virtual analog thumbstick / pedals / power-up tap).
- Rich Web Audio sound effects for missile launches, shield deflections, and collisions.
- Best-lap records persisted in memory with personal record callouts.
