/**
 * Shake Detector — detects shake gestures via DeviceMotion API
 * and Ctrl+Shift+B / Cmd+Shift+B keyboard shortcut.
 */

const DEFAULT_THRESHOLD = 8;
const DEFAULT_COOLDOWN_MS = 2000;
const DEFAULT_MULTI_TAP_COUNT = 4;
const DEFAULT_MULTI_TAP_WINDOW_MS = 1500;

export interface ShakeDetectorOptions {
  threshold?: number;
  cooldownMs?: number;
  debug?: boolean;
  multiTapEnabled?: boolean;
  multiTapCount?: number;
  multiTapWindowMs?: number;
}

let motionListener: ((event: Event) => void) | null = null;
let keyListener: ((event: KeyboardEvent) => void) | null = null;
let touchListener: ((event: Event) => void) | null = null;

export function startShakeDetection(
  callback: () => void,
  options?: ShakeDetectorOptions,
): void {
  const threshold = options?.threshold ?? DEFAULT_THRESHOLD;
  const cooldownMs = options?.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  const debug = options?.debug ?? false;

  let lastX = 0;
  let lastY = 0;
  let lastZ = 0;
  let hasBaseline = false;
  let lastShakeTime = 0;

  function fireCooldownCallback() {
    const now = Date.now();
    if (now - lastShakeTime >= cooldownMs) {
      lastShakeTime = now;
      callback();
    }
  }

  motionListener = (event: Event) => {
    const motionEvent = event as DeviceMotionEvent;
    const accel = motionEvent.accelerationIncludingGravity;
    if (!accel || accel.x == null || accel.y == null || accel.z == null) return;

    const { x, y, z } = accel;

    if (!hasBaseline) {
      lastX = x;
      lastY = y;
      lastZ = z;
      hasBaseline = true;
      return;
    }

    const deltaX = Math.abs(x - lastX);
    const deltaY = Math.abs(y - lastY);
    const deltaZ = Math.abs(z - lastZ);

    lastX = x;
    lastY = y;
    lastZ = z;

    if (debug) {
      const total = deltaX + deltaY + deltaZ;
      console.log(`[shake-debug] dX=${deltaX.toFixed(2)} dY=${deltaY.toFixed(2)} dZ=${deltaZ.toFixed(2)} total=${total.toFixed(2)} threshold=${threshold}`);
    }

    if (deltaX + deltaY + deltaZ > threshold) {
      fireCooldownCallback();
    }
  };

  keyListener = (e: KeyboardEvent) => {
    if (
      e.key.toLowerCase() === 'b' &&
      e.shiftKey &&
      (e.ctrlKey || e.metaKey)
    ) {
      e.preventDefault();
      fireCooldownCallback();
    }
  };

  window.addEventListener('devicemotion', motionListener);
  window.addEventListener('keydown', keyListener);

  // Multi-tap detection (mobile fallback for unreliable shake)
  const multiTapEnabled = options?.multiTapEnabled ?? true;
  if (multiTapEnabled) {
    const tapCount = options?.multiTapCount ?? DEFAULT_MULTI_TAP_COUNT;
    const tapWindowMs = options?.multiTapWindowMs ?? DEFAULT_MULTI_TAP_WINDOW_MS;
    let tapTimestamps: number[] = [];

    touchListener = (event: Event) => {
      const touchEvent = event as TouchEvent;
      if (touchEvent.touches.length !== 1) return;

      const now = Date.now();
      tapTimestamps = tapTimestamps.filter((t) => now - t < tapWindowMs);
      tapTimestamps.push(now);

      if (debug) {
        console.log(`[multitap-debug] tap ${tapTimestamps.length}/${tapCount}`);
      }

      if (tapTimestamps.length >= tapCount) {
        tapTimestamps = [];
        fireCooldownCallback();
      }
    };

    window.addEventListener('touchstart', touchListener, { passive: true });
  }
}

export function stopShakeDetection(): void {
  if (motionListener) {
    window.removeEventListener('devicemotion', motionListener);
    motionListener = null;
  }
  if (keyListener) {
    window.removeEventListener('keydown', keyListener);
    keyListener = null;
  }
  if (touchListener) {
    window.removeEventListener('touchstart', touchListener);
    touchListener = null;
  }
}

