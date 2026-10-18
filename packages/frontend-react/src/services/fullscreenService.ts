class FullscreenService {
  isCapable = !!document.documentElement.requestFullscreen;

  get isActive() {
    return !!document.fullscreenElement;
  }

  async request() {
    if (!this.isCapable || this.isActive) return;
    try {
      await document.documentElement.requestFullscreen();
    } catch (e) {
      console.warn(e);
    }
  }

  async exit() {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch (e) {
      console.warn(e);
    }
  }
}

export const fullscreenService = new FullscreenService();
