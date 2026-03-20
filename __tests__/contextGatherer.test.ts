/**
 * @jest-environment jsdom
 */
import { gatherContext } from '../src/contextGatherer';

describe('contextGatherer', () => {
  it('should return platform, userAgent, and screenSize', () => {
    const ctx = gatherContext();

    expect(ctx.platform).toBeTruthy();
    expect(typeof ctx.userAgent).toBe('string');
    expect(ctx.screenSize).toHaveProperty('width');
    expect(ctx.screenSize).toHaveProperty('height');
    expect(ctx.screenSize.width).toBeGreaterThan(0);
    expect(ctx.screenSize.height).toBeGreaterThan(0);
    expect(ctx.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should include route when getRoute callback is provided', () => {
    const ctx = gatherContext({
      getRoute: () => '/(app)/day-detail/2026-02-24',
    });

    expect(ctx.route).toBe('/(app)/day-detail/2026-02-24');
  });

  it('should return null route when no getRoute callback', () => {
    const ctx = gatherContext();
    expect(ctx.route).toBeNull();
  });

  it('should invoke getAppState callback and include result', () => {
    const mockState = { mealPlan: { meals: [] }, preferences: { theme: 'dark' } };
    const getAppState = jest.fn(() => mockState);

    const ctx = gatherContext({ getAppState });

    expect(getAppState).toHaveBeenCalledTimes(1);
    expect(ctx.appState).toEqual(mockState);
  });

  it('should return null appState when no getAppState callback', () => {
    const ctx = gatherContext();
    expect(ctx.appState).toBeNull();
  });

  it('should return null appState when getAppState throws', () => {
    const ctx = gatherContext({
      getAppState: () => { throw new Error('store not ready'); },
    });

    expect(ctx.appState).toBeNull();
    expect(ctx.platform).toBeTruthy();
    expect(ctx.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should return null route when getRoute throws', () => {
    const ctx = gatherContext({
      getRoute: () => { throw new Error('navigation not mounted'); },
    });

    expect(ctx.route).toBeNull();
    expect(ctx.platform).toBeTruthy();
  });
});
