/**
 * BugReporter — root provider component.
 * Wraps your app and provides shake-to-report bug reporting.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { initConsoleBuffer, getBufferedLogs, resetConsoleBuffer } from './consoleBuffer';
import {
  startShakeDetection,
  stopShakeDetection,
  ShakeDetectorOptions,
} from './shakeDetector';
import { captureScreenshot } from './screenshotCapture';
import { gatherContext, GatherContextOptions } from './contextGatherer';
import BugReportModal, { SubmitBugReport } from './BugReportModal';

export interface BugReporterProps {
  webhookUrl: string;
  projectName: string;
  getAppState?: () => unknown;
  getRoute?: () => string | null;
  enabled?: boolean;
  shakeOptions?: ShakeDetectorOptions;
  onSubmit?: SubmitBugReport;
  children?: React.ReactNode;
}

const BugReporter: React.FC<BugReporterProps> = ({
  webhookUrl,
  projectName,
  getAppState,
  getRoute,
  enabled = true,
  shakeOptions,
  onSubmit,
  children,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [context, setContext] = useState<Record<string, unknown>>({});
  const getAppStateRef = useRef(getAppState);
  const getRouteRef = useRef(getRoute);
  const modalVisibleRef = useRef(modalVisible);

  // Keep refs up to date
  getAppStateRef.current = getAppState;
  getRouteRef.current = getRoute;
  modalVisibleRef.current = modalVisible;

  const handleShake = useCallback(async () => {
    if (modalVisibleRef.current) return;

    try {
      const [screenshotData, contextData] = await Promise.all([
        captureScreenshot(),
        Promise.resolve(
          gatherContext({
            getAppState: getAppStateRef.current,
            getRoute: getRouteRef.current,
          } as GatherContextOptions),
        ),
      ]);

      const consoleLogs = getBufferedLogs();

      setScreenshot(screenshotData);
      setContext({ ...contextData, consoleLogs });
      setModalVisible(true);
    } catch {
      // Silently swallow — do NOT console.error here to avoid recursion risk.
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    initConsoleBuffer();
    startShakeDetection(handleShake, shakeOptions);

    return () => {
      stopShakeDetection();
      resetConsoleBuffer();
    };
  }, [enabled, handleShake, shakeOptions]);

  const handleClose = useCallback(() => {
    setModalVisible(false);
    setScreenshot(null);
    setContext({});
  }, []);

  return (
    <>
      {children}
      <BugReportModal
        visible={modalVisible}
        screenshot={screenshot}
        webhookUrl={webhookUrl}
        context={context}
        projectName={projectName}
        onClose={handleClose}
        onSubmit={onSubmit}
      />
    </>
  );
};

export default BugReporter;
