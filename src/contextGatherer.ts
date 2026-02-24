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

  const route = options?.getRoute?.() ?? null;
  const appState = options?.getAppState?.() ?? null;

  return {
    platform,
    userAgent,
    screenSize,
    route,
    appState,
    timestamp: Date.now(),
  };
}
