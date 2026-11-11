/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InputState } from '../types/game';

export class InputManager {
  private state: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    handbrake: false,
    powerup: false,
  };

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private activeTouchInputs = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    powerup: false,
  };

  constructor() {
    this.boundKeyDown = this.onKeyDown.bind(this);
    this.boundKeyUp = this.onKeyUp.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
  }

  private onKeyDown(e: KeyboardEvent): void {
    const code = e.code;
    // Prevent default scroll behavior for game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      e.preventDefault();
    }

    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.state.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.state.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.state.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.state.right = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.state.handbrake = true;
        break;
      case 'Space':
        this.state.powerup = true;
        break;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    const code = e.code;
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.state.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.state.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.state.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.state.right = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.state.handbrake = false;
        break;
      case 'Space':
        this.state.powerup = false;
        break;
    }
  }

  public setTouchInput(key: keyof typeof this.activeTouchInputs, active: boolean): void {
    this.activeTouchInputs[key] = active;
  }

  public getInput(): InputState {
    return {
      forward: this.state.forward || this.activeTouchInputs.forward,
      backward: this.state.backward || this.activeTouchInputs.backward,
      left: this.state.left || this.activeTouchInputs.left,
      right: this.state.right || this.activeTouchInputs.right,
      handbrake: this.state.handbrake,
      powerup: this.state.powerup || this.activeTouchInputs.powerup,
    };
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }
}
