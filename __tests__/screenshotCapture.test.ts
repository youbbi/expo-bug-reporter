/**
 * @jest-environment jsdom
 */
import { captureScreenshot } from '../src/screenshotCapture';

// Mock html2canvas
jest.mock('html2canvas', () => {
  return jest.fn();
});

import html2canvas from 'html2canvas';
const mockHtml2Canvas = html2canvas as jest.MockedFunction<typeof html2canvas>;

describe('screenshotCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a base64 data URL string on success', async () => {
    const mockCanvas = {
      toDataURL: jest.fn(() => 'data:image/png;base64,iVBORw0KGgo='),
    };
    mockHtml2Canvas.mockResolvedValue(mockCanvas as any);

    const result = await captureScreenshot();

    expect(mockHtml2Canvas).toHaveBeenCalledWith(document.body);
    expect(result).toBe('data:image/png;base64,iVBORw0KGgo=');
  });

  it('should return null when html2canvas throws', async () => {
    mockHtml2Canvas.mockRejectedValue(new Error('capture failed'));

    const result = await captureScreenshot();

    expect(result).toBeNull();
  });

  it('should return null when html2canvas is not available', async () => {
    mockHtml2Canvas.mockImplementation(() => {
      throw new Error('module not found');
    });

    const result = await captureScreenshot();

    expect(result).toBeNull();
  });
});
