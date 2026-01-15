class StateManager {
  constructor() {
    this.devicesStates = new Map();
  }

  getState(deviceId) {
    return this.devicesStates.get(deviceId) || null;
  }

  setState(deviceId, state) {
    this.devicesStates.set(deviceId, {
      ...state,
      lastStateChange: state.lastStateChange || new Date(),
    });
  }

  processTransition(deviceId, currentlyInside, deviceInfo) {
    const previousState = this.getState(deviceId);
    const now = new Date();

    if (!previousState) {
      this.setState(deviceId, {
        isInside: currentlyInside,
        lastStateChange: now,
        indentifier: deviceInfo.indentifier,
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
    const transitionType = previousState.isInside ? 'SAIDA' : 'ENTRADA';

    this.setState(deviceId, {
      isInside: currentlyInside,
      lastStateChange: now,
      indentifier: deviceInfo.indentifier,
      plate: deviceInfo.plate,
    });

    return {
      hasTransition: true,
      previousState: previousState.isInside,
      duration,
      transitionType,
    };
  }

  formatDuration(ms) {
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

  getDeviceCount() {
    return this.devicesStates.size;
  }
}

export const stateManager = new StateManager();
