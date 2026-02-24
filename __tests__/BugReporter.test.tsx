/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import BugReporter from '../src/BugReporter';

// Mock internal modules
jest.mock('../src/consoleBuffer', () => ({
  initConsoleBuffer: jest.fn(),
  getBufferedLogs: jest.fn(() => []),
  clearBuffer: jest.fn(),
}));

jest.mock('../src/shakeDetector', () => ({
  startShakeDetection: jest.fn(),
  stopShakeDetection: jest.fn(),
}));

jest.mock('../src/screenshotCapture', () => ({
  captureScreenshot: jest.fn(() => Promise.resolve('data:image/png;base64,test')),
}));

jest.mock('../src/contextGatherer', () => ({
  gatherContext: jest.fn(() => ({
    platform: 'web',
    userAgent: 'test',
    screenSize: { width: 1024, height: 768 },
    route: null,
    appState: null,
    timestamp: Date.now(),
  })),
}));

import { initConsoleBuffer } from '../src/consoleBuffer';
import { startShakeDetection, stopShakeDetection } from '../src/shakeDetector';

describe('BugReporter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize console buffer on mount', () => {
    render(
      <BugReporter webhookUrl="https://example.com/api/bug-report" projectName="test">
        <div>App content</div>
      </BugReporter>
    );

    expect(initConsoleBuffer).toHaveBeenCalledTimes(1);
  });

  it('should start shake detection on mount', () => {
    render(
      <BugReporter webhookUrl="https://example.com/api/bug-report" projectName="test">
        <div>App content</div>
      </BugReporter>
    );

    expect(startShakeDetection).toHaveBeenCalledTimes(1);
    expect(startShakeDetection).toHaveBeenCalledWith(expect.any(Function), undefined);
  });

  it('should stop shake detection on unmount', () => {
    const { unmount } = render(
      <BugReporter webhookUrl="https://example.com/api/bug-report" projectName="test">
        <div>App content</div>
      </BugReporter>
    );

    unmount();
    expect(stopShakeDetection).toHaveBeenCalledTimes(1);
  });

  it('should do nothing when enabled is false', () => {
    render(
      <BugReporter webhookUrl="https://example.com/api/bug-report" projectName="test" enabled={false}>
        <div>App content</div>
      </BugReporter>
    );

    expect(initConsoleBuffer).not.toHaveBeenCalled();
    expect(startShakeDetection).not.toHaveBeenCalled();
  });

  it('should render children', () => {
    render(
      <BugReporter webhookUrl="https://example.com/api/bug-report" projectName="test">
        <div data-testid="child">App content</div>
      </BugReporter>
    );

    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('should open modal when shake callback is triggered', async () => {
    let shakeCallback: (() => void) | undefined;
    (startShakeDetection as jest.Mock).mockImplementation((cb: () => void) => {
      shakeCallback = cb;
    });

    render(
      <BugReporter webhookUrl="https://example.com/api/bug-report" projectName="test">
        <div>App content</div>
      </BugReporter>
    );

    // Trigger shake
    await act(async () => {
      shakeCallback?.();
    });

    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
