import type {
  DeviceState,
  Transition,
  TransitionType,
  DeviceInfo,
} from '../types';

export class StateManager {
  private devicesStates: Map<string, DeviceState> = new Map();

  getState(deviceId: string): DeviceState | null {
    return this.devicesStates.get(deviceId) || null;
  }

  private setState(deviceId: string, state: DeviceState): void {
    this.devicesStates.set(deviceId, {
      ...state,
      lastStateChange: state.lastStateChange || new Date(),
    });
  }

  processTransition(
    deviceId: string,
    currentlyInside: boolean,
    deviceInfo: DeviceInfo
  ): Transition {
    const previousState = this.getState(deviceId);
    const now = new Date();

    if (!previousState) {
      this.setState(deviceId, {
        isInside: currentlyInside,
        lastStateChange: now,
        identifier: deviceInfo.identifier,
        plate: deviceInfo.plate,
      });

      return {
        hasTransition: false,
        previousState: null,
        duration: null,
        transitionType: 'PRIMEIRO_REGISTRO',
      };
    }

    if (previousState.isInside === currentlyInside) {
      return {
        hasTransition: false,
        previousState: previousState.isInside,
        duration: null,
        transitionType: null,
      };
    }

    const duration = now.getTime() - previousState.lastStateChange.getTime();
    const transitionType: TransitionType = previousState.isInside
      ? 'SAIDA'
      : 'ENTRADA';

    this.setState(deviceId, {
      isInside: currentlyInside,
      lastStateChange: now,
      identifier: deviceInfo.identifier,
      plate: deviceInfo.plate,
    });

    return {
      hasTransition: true,
      previousState: previousState.isInside,
      duration,
      transitionType,
    };
  }

  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  getDeviceCount(): number {
    return this.devicesStates.size;
  }
}

export const stateManager = new StateManager();
