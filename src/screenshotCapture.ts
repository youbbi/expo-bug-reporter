/**
 * Screenshot Capture — captures the current screen as a base64 image.
 */

import html2canvas from 'html2canvas';

export async function captureScreenshot(): Promise<string | null> {
  try {
    const canvas = await html2canvas(document.body);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
