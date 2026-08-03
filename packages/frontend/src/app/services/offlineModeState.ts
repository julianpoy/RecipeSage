export interface OfflineModeEnabledWaiter {
  promise: Promise<void>;
  dispose: () => void;
}

export interface OfflineModeHooks {
  notifySlowRead: () => void;
  showBlockedError: () => void;
  notifyEnabledChanged: () => void;
}

class OfflineModeState {
  private sessionEnabled = false;
  private waiters = new Set<() => void>();
  private hooks: OfflineModeHooks | undefined;

  get enabled(): boolean {
    return this.sessionEnabled;
  }

  registerHooks(hooks: OfflineModeHooks): void {
    this.hooks = hooks;
  }

  enable(): void {
    if (this.sessionEnabled) return;
    this.sessionEnabled = true;
    const waiters = [...this.waiters];
    this.waiters.clear();
    for (const waiter of waiters) {
      waiter();
    }
    this.hooks?.notifyEnabledChanged();
  }

  disable(): void {
    if (!this.sessionEnabled) return;
    this.sessionEnabled = false;
    this.hooks?.notifyEnabledChanged();
  }

  whenEnabled(): OfflineModeEnabledWaiter {
    if (this.sessionEnabled) {
      return { promise: Promise.resolve(), dispose: () => {} };
    }

    let resolver!: () => void;
    const promise = new Promise<void>((resolve) => {
      resolver = resolve;
    });
    this.waiters.add(resolver);

    return {
      promise,
      dispose: () => {
        this.waiters.delete(resolver);
      },
    };
  }

  notifySlowRead(): void {
    this.hooks?.notifySlowRead();
  }

  showBlockedError(): void {
    this.hooks?.showBlockedError();
  }
}

export const offlineModeState = new OfflineModeState();
