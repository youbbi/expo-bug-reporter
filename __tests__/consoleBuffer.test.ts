import { initConsoleBuffer, getBufferedLogs, clearBuffer, resetConsoleBuffer } from '../src/consoleBuffer';

describe('consoleBuffer', () => {
  afterEach(() => {
    // Fully reset: restores original console methods and clears module state
    resetConsoleBuffer();
  });

  describe('capture', () => {
    it('should capture console.error with timestamp', () => {
      initConsoleBuffer();

      const before = Date.now();
      console.error('test error message');
      const after = Date.now();

      const logs = getBufferedLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('error');
      expect(logs[0].message).toContain('test error message');
      expect(logs[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(logs[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should capture console.warn with timestamp', () => {
      initConsoleBuffer();

      const before = Date.now();
      console.warn('test warning');
      const after = Date.now();

      const logs = getBufferedLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe('warn');
      expect(logs[0].message).toContain('test warning');
      expect(logs[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(logs[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should NOT capture console.log', () => {
      initConsoleBuffer();

      console.log('this should not be captured');

      const logs = getBufferedLogs();
      expect(logs).toHaveLength(0);
    });

    it('should capture multiple arguments as a joined message', () => {
      initConsoleBuffer();

      console.error('error:', 'detail', 123);

      const logs = getBufferedLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toContain('error:');
      expect(logs[0].message).toContain('detail');
      expect(logs[0].message).toContain('123');
    });
  });

  describe('rolling buffer', () => {
    it('should evict oldest entries when buffer exceeds 20', () => {
      initConsoleBuffer();

      for (let i = 0; i < 25; i++) {
        console.error(`error-${i}`);
      }

      const logs = getBufferedLogs();
      expect(logs).toHaveLength(20);
      // Oldest 5 should be evicted (0-4), first remaining is error-5
      expect(logs[0].message).toContain('error-5');
      expect(logs[19].message).toContain('error-24');
    });
  });

  describe('clearBuffer', () => {
    it('should reset the buffer to empty', () => {
      initConsoleBuffer();

      console.error('something');
      console.warn('another');
      expect(getBufferedLogs()).toHaveLength(2);

      clearBuffer();
      expect(getBufferedLogs()).toHaveLength(0);
    });
  });

  describe('still calls original', () => {
    it('should still call the original console.error', () => {
      const spy = jest.fn();
      console.error = spy;

      initConsoleBuffer();
      console.error('test');

      // The interceptor should have called through to the original
      expect(spy).toHaveBeenCalledWith('test');
    });
  });

  describe('double-init guard', () => {
    it('should not wrap console.error twice when initConsoleBuffer is called multiple times', () => {
      const realError = console.error;

      initConsoleBuffer();
      initConsoleBuffer(); // second call should be a no-op

      // Should not cause infinite recursion
      console.error('no stack overflow');

      const logs = getBufferedLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('no stack overflow');
    });
  });

  describe('circular reference safety', () => {
    it('should handle circular objects without throwing', () => {
      initConsoleBuffer();

      const circular: Record<string, unknown> = { a: 1 };
      circular.self = circular;

      // Should not throw
      expect(() => console.error('circular:', circular)).not.toThrow();

      const logs = getBufferedLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toContain('circular:');
    });
  });
});
