/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GAME_CONFIG } from '../config/gameConfig';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  // Engine Audio Nodes
  private engineGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  // Music Sequencer State
  private musicGain: GainNode | null = null;
  private musicIntervalId: number | null = null;
  private currentStep: number = 0;
  private currentSpeedRatio: number = 0;

  // Bass & Arp notes (A minor / D minor cyberpunk scale)
  private bassNotes = [110, 110, 110, 110, 130.81, 130.81, 146.83, 146.83, 98, 98, 98, 98, 123.47, 123.47, 110, 110];
  private arpNotes = [220, 261.63, 329.63, 440, 329.63, 261.63, 293.66, 349.23, 196, 246.94, 293.66, 392, 246.94, 293.66, 329.63, 440];

  constructor() {
    // AudioContext will be instantiated on first user interaction
  }

  public init(): void {
    if (this.isInitialized) return;

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(GAME_CONFIG.audio.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupEngineSound();
      if (GAME_CONFIG.audio.musicEnabled) {
        this.setupMusicSequencer();
      }

      this.isInitialized = true;
    } catch {
      // AudioContext unavailable or blocked
    }
  }

  public unlock(): void {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private setupEngineSound(): void {
    if (!this.ctx || !this.masterGain) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.01, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(300, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // Primary oscillator (triangle)
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'triangle';
    this.engineOsc1.frequency.setValueAtTime(GAME_CONFIG.audio.engineBaseFreq, this.ctx.currentTime);

    // Harmonic oscillator (sawtooth for cyber grit)
    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'sawtooth';
    this.engineOsc2.frequency.setValueAtTime(GAME_CONFIG.audio.engineBaseFreq * 1.5, this.ctx.currentTime);

    // Deep sub-harmonic oscillator
    this.engineSubOsc = this.ctx.createOscillator();
    this.engineSubOsc.type = 'sine';
    this.engineSubOsc.frequency.setValueAtTime(GAME_CONFIG.audio.engineBaseFreq * 0.5, this.ctx.currentTime);

    // Mixers
    const osc1Gain = this.ctx.createGain();
    osc1Gain.gain.value = 0.5;
    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.value = 0.25;
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.4;

    this.engineOsc1.connect(osc1Gain);
    this.engineOsc2.connect(osc2Gain);
    this.engineSubOsc.connect(subGain);

    osc1Gain.connect(this.engineFilter);
    osc2Gain.connect(this.engineFilter);
    subGain.connect(this.engineFilter);

    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineOsc1.start();
    this.engineOsc2.start();
    this.engineSubOsc.start();
  }

  private setupMusicSequencer(): void {
    if (!this.ctx || !this.masterGain) return;

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    this.musicGain.connect(this.masterGain);

    this.scheduleNextBeat();
  }

  private scheduleNextBeat = (): void => {
    if (!this.ctx || !this.musicGain) return;

    // Tempo scales from ~118 BPM at idle to ~145 BPM at top speed
    const baseBpm = 118 + this.currentSpeedRatio * 26;
    const stepIntervalMs = (60 / baseBpm / 4) * 1000;

    this.playStep(this.currentStep);
    this.currentStep = (this.currentStep + 1) % 16;

    this.musicIntervalId = window.setTimeout(this.scheduleNextBeat, stepIntervalMs);
  };

  private playStep(step: number): void {
    if (!this.ctx || !this.musicGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. Play Driving Bass Pulse
    const bassFreq = this.bassNotes[step];
    const bassOsc = this.ctx.createOscillator();
    const bassEnv = this.ctx.createGain();
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(bassFreq, t);

    // Lowpass filter for warm analog synth bass
    const bassFilter = this.ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.setValueAtTime(380, t);
    bassFilter.frequency.exponentialRampToValueAtTime(120, t + 0.12);

    bassEnv.gain.setValueAtTime(0.35, t);
    bassEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    bassOsc.connect(bassFilter);
    bassFilter.connect(bassEnv);
    bassEnv.connect(this.musicGain);

    bassOsc.start(t);
    bassOsc.stop(t + 0.15);

    // 2. Play Arpeggio Pluck on off-beats
    if (step % 2 === 0 || this.currentSpeedRatio > 0.4) {
      const arpFreq = this.arpNotes[step];
      const arpOsc = this.ctx.createOscillator();
      const arpEnv = this.ctx.createGain();
      arpOsc.type = 'square';
      arpOsc.frequency.setValueAtTime(arpFreq, t);

      const arpFilter = this.ctx.createBiquadFilter();
      arpFilter.type = 'lowpass';
      arpFilter.frequency.setValueAtTime(1400 + this.currentSpeedRatio * 1600, t);
      arpFilter.frequency.exponentialRampToValueAtTime(300, t + 0.1);

      arpEnv.gain.setValueAtTime(0.18, t);
      arpEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      arpOsc.connect(arpFilter);
      arpFilter.connect(arpEnv);
      arpEnv.connect(this.musicGain);

      arpOsc.start(t);
      arpOsc.stop(t + 0.13);
    }
  }

  public updateCarSpeed(speedMps: number, throttle: number, isNitro: boolean): void {
    if (!this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) {
      return;
    }

    const t = this.ctx.currentTime;
    const maxSpeed = GAME_CONFIG.physics.maxSpeed;
    const speedRatio = Math.min(1.2, Math.max(0, speedMps) / maxSpeed);
    this.currentSpeedRatio = speedRatio;

    // Pitch shift based on speed + throttle
    const baseFreq = GAME_CONFIG.audio.engineBaseFreq;
    const maxFreq = GAME_CONFIG.audio.engineMaxFreq;
    const nitroBonus = isNitro ? 50 : 0;
    const throttleBonus = throttle > 0 ? 18 : 0;

    const currentPitch = baseFreq + speedRatio * (maxFreq - baseFreq) + throttleBonus + nitroBonus;

    this.engineOsc1.frequency.setTargetAtTime(currentPitch, t, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(currentPitch * 1.5, t, 0.05);
    if (this.engineSubOsc) {
      this.engineSubOsc.frequency.setTargetAtTime(currentPitch * 0.5, t, 0.05);
    }

    // Filter frequency opens up with throttle and speed
    const cutoff = 250 + speedRatio * 2400 + (throttle > 0 ? 800 : 0) + (isNitro ? 1200 : 0);
    this.engineFilter.frequency.setTargetAtTime(cutoff, t, 0.05);

    // Engine volume: higher when on gas or at speed
    const targetVolume = this.isMuted ? 0 : 0.08 + speedRatio * 0.22 + (throttle > 0 ? 0.12 : 0) + (isNitro ? 0.18 : 0);
    this.engineGain.gain.setTargetAtTime(targetVolume, t, 0.04);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : GAME_CONFIG.audio.masterVolume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public dispose(): void {
    if (this.musicIntervalId !== null) {
      window.clearTimeout(this.musicIntervalId);
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
  }
}
