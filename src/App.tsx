/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './core/Engine';
import { HUD } from './ui/HUD';
import { SpeedLinesOverlay } from './effects/SpeedLinesOverlay';
import { RaceTelemetry } from './types/game';
import { GAME_CONFIG } from './config/gameConfig';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [telemetry, setTelemetry] = useState<RaceTelemetry>({
    speedKmh: 0,
    speedPercent: 0,
    lap: 1,
    maxLaps: GAME_CONFIG.race.totalLaps,
    lapProgress: 0,
    currentLapTime: 0,
    bestLapTime: null,
    lastLapTime: null,
    position: 1,
    totalRacers: 1,
    health: 100,
    maxHealth: 100,
    isDrifting: false,
    activePowerUp: null,
    powerUpSlots: [
      { type: 'nitro', name: 'Nitro', color: '#FACC15', icon: 'zap', isReady: true },
      { type: 'shunt', name: 'Shunt', color: '#10B981', icon: 'crosshair', isReady: false },
      { type: 'mine', name: 'Mine', color: '#EF4444', icon: 'disc', isReady: false },
      { type: 'shock', name: 'Shock', color: '#3B82F6', icon: 'activity', isReady: false },
      { type: 'repair', name: 'Repair', color: '#F8FAFC', icon: 'shield', isReady: false },
    ],
    isFinished: false,
  });

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isAudioStarted, setIsAudioStarted] = useState(false);

  // Initialize Three.js Engine once on mount
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new GameEngine(canvasMountRef.current, (newTelemetry) => {
      setTelemetry((prev) => ({
        ...newTelemetry,
        // In Stage 1 preview, slot 0 (Nitro) is ready so user can test Spacebar boost
        powerUpSlots: prev.powerUpSlots.map((s, idx) => ({
          ...s,
          isReady: idx === 0 ? !newTelemetry.activePowerUp : false,
        })),
      }));
    });

    engineRef.current = engine;

    const handleFirstInteraction = () => {
      if (engineRef.current && !isAudioStarted) {
        engineRef.current.sound.unlock();
        setIsAudioStarted(true);
      }
    };

    window.addEventListener('keydown', handleFirstInteraction, { once: true });
    window.addEventListener('pointerdown', handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('pointerdown', handleFirstInteraction);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleStartAudio = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.sound.unlock();
      setIsAudioStarted(true);
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    if (engineRef.current) {
      const muted = engineRef.current.sound.toggleMute();
      setIsAudioMuted(muted);
    }
  }, []);

  const handleResetCar = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resetCarToTrack();
    }
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#050510]">
      {/* 1. Dedicated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* 2. Speed Lines & Motion Blur Radial Streaks */}
      <SpeedLinesOverlay
        speedKmh={telemetry.speedKmh}
        maxSpeedKmh={GAME_CONFIG.physics.maxSpeed * 3.6}
        isNitro={telemetry.activePowerUp === 'nitro'}
        isDrifting={telemetry.isDrifting}
      />

      {/* 3. Futuristic HUD Overlay */}
      <HUD
        telemetry={telemetry}
        isAudioMuted={isAudioMuted}
        isAudioStarted={isAudioStarted}
        onToggleMute={handleToggleMute}
        onResetCar={handleResetCar}
        onStartAudio={handleStartAudio}
      />
    </main>
  );
}
