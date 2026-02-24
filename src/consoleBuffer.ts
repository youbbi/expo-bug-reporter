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

function addToBuffer(level: 'error' | 'warn', args: unknown[]): void {
  const message = args.map(a =>
    typeof a === 'string' ? a : JSON.stringify(a)
  ).join(' ');

  buffer.push({ level, message, timestamp: Date.now() });

  if (buffer.length > MAX_BUFFER_SIZE) {
    buffer = buffer.slice(buffer.length - MAX_BUFFER_SIZE);
  }
}

export function initConsoleBuffer(): void {
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
