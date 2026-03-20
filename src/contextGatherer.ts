/**
 * Context Gatherer — collects device, route, and app state for bug reports.
 */

export interface BugContext {
  platform: string;
  userAgent: string;
  screenSize: { width: number; height: number };
  route: string | null;
  appState: unknown;
  timestamp: number;
}

export interface GatherContextOptions {
  getAppState?: () => unknown;
  getRoute?: () => string | null;
}

export function gatherContext(options?: GatherContextOptions): BugContext {
  const isWeb = typeof window !== 'undefined';

  const platform = isWeb ? 'web' : 'unknown';
  const userAgent = isWeb ? (navigator?.userAgent ?? '') : '';
  const screenSize = isWeb
    ? { width: window.innerWidth, height: window.innerHeight }
    : { width: 0, height: 0 };

  let route: string | null = null;
  try {
    route = options?.getRoute?.() ?? null;
  } catch {
    route = null;
  }

  let appState: unknown = null;
  try {
    appState = options?.getAppState?.() ?? null;
  } catch {
    appState = null;
  }

  return {
    platform,
    userAgent,
    screenSize,
    route,
    appState,
    timestamp: Date.now(),
  };
}
