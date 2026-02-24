/**
 * @jest-environment jsdom
 */
import {
  startShakeDetection,
  stopShakeDetection,
} from '../src/shakeDetector';

// Helper to dispatch a devicemotion event with given acceleration
function fireMotionEvent(x: number, y: number, z: number) {
  const event = new Event('devicemotion') as any;
  event.accelerationIncludingGravity = { x, y, z };
  window.dispatchEvent(event);
}

// Helper to dispatch a touchstart event
function fireTouchStart(touchCount = 1) {
  const event = new Event('touchstart', { bubbles: true }) as any;
  event.touches = Array.from({ length: touchCount }, () => ({}));
  window.dispatchEvent(event);
}

// Helper to dispatch a keydown event
function fireKeydown(key: string, opts: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(event);
}

describe('shakeDetector', () => {
  afterEach(() => {
    stopShakeDetection();
  });

  it('should fire callback when acceleration exceeds threshold', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { threshold: 15, cooldownMs: 0 });

    // First event sets baseline
    fireMotionEvent(0, 0, 9.8);
    // Second event with large delta triggers shake
    fireMotionEvent(20, 20, 9.8);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should NOT fire callback on gentle motion', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { threshold: 15, cooldownMs: 0 });

    fireMotionEvent(0, 0, 9.8);
    fireMotionEvent(1, 1, 9.8);
    fireMotionEvent(2, 0, 10);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should respect cooldown between shakes', () => {
    jest.useFakeTimers();
    const callback = jest.fn();
    startShakeDetection(callback, { threshold: 15, cooldownMs: 1000 });

    // First shake
    fireMotionEvent(0, 0, 9.8);
    fireMotionEvent(20, 20, 9.8);
    expect(callback).toHaveBeenCalledTimes(1);

    // Immediate second shake — should be blocked by cooldown
    fireMotionEvent(0, 0, 9.8);
    fireMotionEvent(20, 20, 9.8);
    expect(callback).toHaveBeenCalledTimes(1);

    // After cooldown expires
    jest.advanceTimersByTime(1000);
    fireMotionEvent(0, 0, 9.8);
    fireMotionEvent(20, 20, 9.8);
    expect(callback).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('should stop listening after stopShakeDetection is called', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { threshold: 15, cooldownMs: 0 });

    stopShakeDetection();

    fireMotionEvent(0, 0, 9.8);
    fireMotionEvent(20, 20, 9.8);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should not throw if stopShakeDetection is called before start', () => {
    expect(() => stopShakeDetection()).not.toThrow();
  });
});

describe('keyboard shortcut (Ctrl+Shift+B / Cmd+Shift+B)', () => {
  afterEach(() => {
    stopShakeDetection();
  });

  it('should fire callback on Ctrl+Shift+B', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0 });

    fireKeydown('b', { ctrlKey: true, shiftKey: true });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should fire callback on Cmd+Shift+B (Mac)', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0 });

    fireKeydown('b', { metaKey: true, shiftKey: true });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should handle uppercase B key', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0 });

    fireKeydown('B', { ctrlKey: true, shiftKey: true });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should NOT fire on Ctrl+B without Shift', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0 });

    fireKeydown('b', { ctrlKey: true });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should NOT fire on Shift+B without Ctrl or Cmd', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0 });

    fireKeydown('b', { shiftKey: true });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should NOT fire on Ctrl+Shift+A (wrong key)', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0 });

    fireKeydown('a', { ctrlKey: true, shiftKey: true });

    expect(callback).not.toHaveBeenCalled();
  });

  it('should respect cooldown for keyboard shortcut', () => {
    jest.useFakeTimers();
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 1000 });

    fireKeydown('b', { ctrlKey: true, shiftKey: true });
    expect(callback).toHaveBeenCalledTimes(1);

    // Immediate second press — blocked by cooldown
    fireKeydown('b', { ctrlKey: true, shiftKey: true });
    expect(callback).toHaveBeenCalledTimes(1);

    // After cooldown
    jest.advanceTimersByTime(1000);
    fireKeydown('b', { ctrlKey: true, shiftKey: true });
    expect(callback).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('should share cooldown between shake and keyboard', () => {
    jest.useFakeTimers();
    const callback = jest.fn();
    startShakeDetection(callback, { threshold: 15, cooldownMs: 1000 });

    // Trigger via shake
    fireMotionEvent(0, 0, 9.8);
    fireMotionEvent(20, 20, 9.8);
    expect(callback).toHaveBeenCalledTimes(1);

    // Immediate keyboard — blocked by shared cooldown
    fireKeydown('b', { ctrlKey: true, shiftKey: true });
    expect(callback).toHaveBeenCalledTimes(1);

    // After cooldown, keyboard works
    jest.advanceTimersByTime(1000);
    fireKeydown('b', { ctrlKey: true, shiftKey: true });
    expect(callback).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  it('should stop keyboard listener after stopShakeDetection', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0 });

    stopShakeDetection();

    fireKeydown('b', { ctrlKey: true, shiftKey: true });

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('default threshold (8)', () => {
  afterEach(() => {
    stopShakeDetection();
  });

  it('should reject gentle motion (delta sum ~2)', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0 });

    fireMotionEvent(0, 0, 9.8);
    fireMotionEvent(1, 0.5, 10.3); // delta: 1 + 0.5 + 0.5 = 2

    expect(callback).not.toHaveBeenCalled();
  });

  it('should fire on moderate shake (delta sum ~9)', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0 });

    fireMotionEvent(0, 0, 9.8);
    fireMotionEvent(4, 3, 12.8); // delta: 4 + 3 + 3 = 10 > 8

    expect(callback).toHaveBeenCalledTimes(1);
  });
});

describe('debug option', () => {
  afterEach(() => {
    stopShakeDetection();
  });

  it('should log shake-debug output when debug is true', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const callback = jest.fn();
    startShakeDetection(callback, { debug: true, cooldownMs: 0 });

    fireMotionEvent(0, 0, 9.8);
    fireMotionEvent(1, 1, 10);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[shake-debug]'),
    );
    consoleSpy.mockRestore();
  });

  it('should NOT log when debug is false (default)', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0 });

    fireMotionEvent(0, 0, 9.8);
    fireMotionEvent(1, 1, 10);

    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('[shake-debug]'),
    );
    consoleSpy.mockRestore();
  });
});

describe('multi-tap detection', () => {
  afterEach(() => {
    stopShakeDetection();
    jest.useRealTimers();
  });

  it('should fire callback after 4 single-finger taps', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0 });

    fireTouchStart();
    fireTouchStart();
    fireTouchStart();
    fireTouchStart();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should ignore multi-finger touches', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0 });

    fireTouchStart(2);
    fireTouchStart(2);
    fireTouchStart(2);
    fireTouchStart(2);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should reset tap count when window expires', () => {
    jest.useFakeTimers();
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0, multiTapWindowMs: 1000 });

    fireTouchStart();
    fireTouchStart();
    fireTouchStart();

    // Let the window expire
    jest.advanceTimersByTime(1100);

    // These taps start a fresh sequence — only 1 tap so far
    fireTouchStart();

    expect(callback).not.toHaveBeenCalled();
  });

  it('should respect custom multiTapCount', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0, multiTapCount: 2 });

    fireTouchStart();
    fireTouchStart();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should respect custom multiTapWindowMs', () => {
    jest.useFakeTimers();
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0, multiTapWindowMs: 500 });

    fireTouchStart();
    jest.advanceTimersByTime(400);
    fireTouchStart();
    jest.advanceTimersByTime(400);
    fireTouchStart();
    jest.advanceTimersByTime(400);
    // First tap is now >500ms old, so only 2 taps in window
    fireTouchStart();

    expect(callback).not.toHaveBeenCalled();
  });

  it('should share cooldown with shake and keyboard', () => {
    jest.useFakeTimers();
    const callback = jest.fn();
    startShakeDetection(callback, { threshold: 15, cooldownMs: 1000 });

    // Trigger via shake
    fireMotionEvent(0, 0, 9.8);
    fireMotionEvent(20, 20, 9.8);
    expect(callback).toHaveBeenCalledTimes(1);

    // Immediate multi-tap — blocked by shared cooldown
    fireTouchStart();
    fireTouchStart();
    fireTouchStart();
    fireTouchStart();
    expect(callback).toHaveBeenCalledTimes(1);

    // After cooldown, multi-tap works
    jest.advanceTimersByTime(1000);
    fireTouchStart();
    fireTouchStart();
    fireTouchStart();
    fireTouchStart();
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should not register touches when multiTapEnabled is false', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0, multiTapEnabled: false });

    fireTouchStart();
    fireTouchStart();
    fireTouchStart();
    fireTouchStart();

    expect(callback).not.toHaveBeenCalled();
  });

  it('should stop listening after stopShakeDetection', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0 });

    stopShakeDetection();

    fireTouchStart();
    fireTouchStart();
    fireTouchStart();
    fireTouchStart();

    expect(callback).not.toHaveBeenCalled();
  });

  it('should reset tap sequence after successful trigger', () => {
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0 });

    // First trigger
    fireTouchStart();
    fireTouchStart();
    fireTouchStart();
    fireTouchStart();
    expect(callback).toHaveBeenCalledTimes(1);

    // Need 4 fresh taps for next trigger
    fireTouchStart();
    fireTouchStart();
    expect(callback).toHaveBeenCalledTimes(1);

    fireTouchStart();
    fireTouchStart();
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should log multitap-debug when debug is true', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0, debug: true });

    fireTouchStart();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[multitap-debug]'),
    );
    consoleSpy.mockRestore();
  });

  it('should NOT log multitap-debug when debug is false', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const callback = jest.fn();
    startShakeDetection(callback, { cooldownMs: 0 });

    fireTouchStart();

    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('[multitap-debug]'),
    );
    consoleSpy.mockRestore();
  });
});

