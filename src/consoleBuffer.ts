/**
 * Console Buffer — captures console.error and console.warn in a rolling buffer.
 */

const MAX_BUFFER_SIZE = 20;

export interface BufferedLog {
  level: 'error' | 'warn';
  message: string;
  timestamp: number;
}

let buffer: BufferedLog[] = [];
let originalError: typeof console.error | null = null;
let originalWarn: typeof console.warn | null = null;
let isBuffering = false;

function addToBuffer(level: 'error' | 'warn', args: unknown[]): void {
  if (isBuffering) return; // Prevent re-entrant calls (infinite recursion)
  isBuffering = true;
  try {
    const message = args.map(a => {
      if (typeof a === 'string') return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    }).join(' ');

    buffer.push({ level, message, timestamp: Date.now() });

    if (buffer.length > MAX_BUFFER_SIZE) {
      buffer = buffer.slice(buffer.length - MAX_BUFFER_SIZE);
    }
  } finally {
    isBuffering = false;
  }
}

export function initConsoleBuffer(): void {
  if (originalError) return; // Already initialized — prevent self-referencing loop

  originalError = console.error;
  originalWarn = console.warn;

  console.error = (...args: unknown[]) => {
    addToBuffer('error', args);
    originalError?.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    addToBuffer('warn', args);
    originalWarn?.apply(console, args);
  };
}

export function getBufferedLogs(): BufferedLog[] {
  return [...buffer];
}

export function clearBuffer(): void {
  buffer = [];
}

/** Restore original console methods and reset state. Useful for teardown/testing. */
export function resetConsoleBuffer(): void {
  if (originalError) console.error = originalError;
  if (originalWarn) console.warn = originalWarn;
  originalError = null;
  originalWarn = null;
  buffer = [];
  isBuffering = false;
}
