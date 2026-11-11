/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RaceTelemetry } from '../types/game';
import { Volume2, VolumeX, RotateCcw, Zap, Crosshair, Disc, Activity, Shield } from 'lucide-react';

interface HUDProps {
  telemetry: RaceTelemetry;
  isAudioMuted: boolean;
  isAudioStarted: boolean;
  onToggleMute: () => void;
  onResetCar: () => void;
  onStartAudio: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  isAudioMuted,
  isAudioStarted,
  onToggleMute,
  onResetCar,
  onStartAudio,
}) => {
  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '--:--.--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Arc layout for the 5 power-up slots (angles from -48deg to +48deg)
  const slotAngles = [-48, -24, 0, 24, 48];
  const arcRadius = 140; // pixel radius of the semicircle arc

  const getPowerUpIcon = (type: string) => {
    switch (type) {
      case 'nitro':
        return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'shunt':
        return <Crosshair className="w-5 h-5 text-emerald-400" />;
      case 'mine':
        return <Disc className="w-5 h-5 text-rose-500" />;
      case 'shock':
        return <Activity className="w-5 h-5 text-blue-400" />;
      case 'repair':
        return <Shield className="w-5 h-5 text-slate-100" />;
      default:
        return null;
    }
  };

  return (
    <div
      className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 select-none"
      onClick={!isAudioStarted ? onStartAudio : undefined}
    >
      {/* 1. TOP TELEMETRY BAR */}
      <header className="flex items-start justify-between w-full max-w-7xl mx-auto">
        {/* Left: Position & Game Title */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="font-orbitron text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-pink-500">
              NEON CLASH
            </span>
            <span className="text-xs text-cyan-400/80 font-mono tracking-widest uppercase">
              Stage 1 Preview
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xs text-slate-400 uppercase font-mono tracking-wider">Position</span>
            <span className="font-orbitron text-2xl font-bold text-white tabular-nums">
              0{telemetry.position} <span className="text-sm text-slate-500">/ 0{telemetry.totalRacers}</span>
            </span>
          </div>
        </div>

        {/* Center: Lap & Times */}
        <div className="flex items-center gap-8 px-6 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 backdrop-blur-md shadow-2xl">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Lap</span>
            <span className="font-orbitron text-xl font-bold text-cyan-300 tabular-nums">
              {Math.min(telemetry.lap, telemetry.maxLaps)} <span className="text-xs text-slate-500">/ {telemetry.maxLaps}</span>
            </span>
          </div>

          <div className="w-px h-8 bg-white/10" />

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Lap Time</span>
            <span className="font-orbitron text-lg font-bold text-white tabular-nums tracking-wide">
              {formatTime(telemetry.currentLapTime)}
            </span>
          </div>

          <div className="w-px h-8 bg-white/10" />

          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Best Lap</span>
            <span className="font-orbitron text-sm font-semibold text-pink-400 tabular-nums tracking-wide">
              {formatTime(telemetry.bestLapTime)}
            </span>
          </div>
        </div>

        {/* Right: Health & Audio / Controls */}
        <div className="flex items-center gap-3 pointer-events-auto">
          {/* Health Gauge */}
          <div className="flex flex-col items-end mr-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Armor</span>
              <span className="font-orbitron text-xs font-bold text-cyan-300 tabular-nums">
                {Math.round(telemetry.health)}%
              </span>
            </div>
            <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-cyan-400 transition-all duration-150"
                style={{ width: `${(telemetry.health / telemetry.maxHealth) * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={onToggleMute}
            className="p-2.5 rounded-lg bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:border-cyan-400/50 hover:bg-slate-800 transition-all cursor-pointer shadow-lg"
            title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            onClick={onResetCar}
            className="p-2.5 rounded-lg bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:border-cyan-400/50 hover:bg-slate-800 transition-all cursor-pointer shadow-lg"
            title="Reset to Track Center"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. AUDIO PROMPT CALLOUT (If not yet clicked) */}
      {!isAudioStarted && (
        <div className="self-center px-6 py-2.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-200 text-xs font-mono tracking-wider animate-pulse shadow-lg pointer-events-auto cursor-pointer">
          PRESS ANY KEY OR CLICK TO ENGAGE SYNTHWAVE AUDIO
        </div>
      )}

      {/* 3. BOTTOM HUD: SPEEDOMETER & SEMICIRCLE POWER-UP ARC */}
      <footer className="relative flex flex-col items-center justify-end pb-2">
        {/* Speedometer Digital Readout */}
        <div className="flex flex-col items-center mb-4">
          <div className="flex items-baseline gap-1">
            <span className="font-orbitron text-5xl font-black text-white tabular-nums tracking-tighter drop-shadow-[0_0_15px_rgba(0,240,255,0.4)]">
              {Math.round(telemetry.speedKmh)}
            </span>
            <span className="font-orbitron text-xs font-semibold text-cyan-400 tracking-wider">
              KM/H
            </span>
          </div>

          {/* Speed Progress Arc Indicator */}
          <div className="w-44 h-1 bg-slate-800/80 rounded-full overflow-hidden mt-1 border border-white/5">
            <div
              className={`h-full transition-all duration-75 ${
                telemetry.isDrifting
                  ? 'bg-gradient-to-r from-amber-400 to-pink-500'
                  : 'bg-gradient-to-r from-cyan-400 to-blue-500'
              }`}
              style={{ width: `${Math.min(100, (telemetry.speedKmh / 220) * 100)}%` }}
            />
          </div>

          {telemetry.isDrifting && (
            <span className="text-[10px] font-orbitron font-bold text-pink-400 tracking-widest uppercase mt-1 animate-pulse">
              DRIFT
            </span>
          )}
        </div>

        {/* SEMICIRCLE POWER-UP ARC DOCK */}
        <div className="relative w-80 h-32 flex items-center justify-center">
          {/* Subtle curved arc guideline */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 128">
            <path
              d="M 40 110 A 130 130 0 0 1 280 110"
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="2"
              strokeDasharray="4 6"
            />
          </svg>

          {/* 5 Semicircle Slots */}
          {telemetry.powerUpSlots.map((slot, idx) => {
            const angleDeg = slotAngles[idx];
            const angleRad = (angleDeg - 90) * (Math.PI / 180);
            const x = Math.cos(angleRad) * arcRadius;
            const y = Math.sin(angleRad) * arcRadius + 115;

            return (
              <div
                key={slot.type}
                className="absolute flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `calc(50% + ${x}px)`,
                  top: `${y}px`,
                }}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                    slot.isReady
                      ? 'bg-slate-900 border-2 shadow-[0_0_18px]'
                      : 'bg-slate-950/70 border border-white/10 opacity-40'
                  }`}
                  style={{
                    borderColor: slot.isReady ? slot.color : 'rgba(255,255,255,0.1)',
                    boxShadow: slot.isReady ? `0 0 20px ${slot.color}66` : 'none',
                  }}
                >
                  {getPowerUpIcon(slot.type)}
                </div>

                <span
                  className="text-[9px] font-orbitron font-bold uppercase tracking-wider mt-1"
                  style={{ color: slot.isReady ? slot.color : '#64748b' }}
                >
                  {slot.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Controls Helper Bar */}
        <div className="flex items-center gap-4 text-xs font-mono text-slate-400 mt-2 px-4 py-1.5 rounded-lg bg-slate-950/70 border border-white/5 backdrop-blur-sm">
          <span><strong className="text-white">W / ↑</strong> Accel</span>
          <span><strong className="text-white">S / ↓</strong> Brake</span>
          <span><strong className="text-white">A/D / ←/→</strong> Steer</span>
          <span><strong className="text-white">SHIFT</strong> Drift</span>
          <span><strong className="text-white">SPACE</strong> Power-Up</span>
        </div>
      </footer>
    </div>
  );
};
