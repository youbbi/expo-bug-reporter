/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BugReportModal from '../src/BugReportModal';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const defaultProps = {
  visible: true,
  screenshot: 'data:image/png;base64,abc123',
  webhookUrl: 'https://example.com/api/bug-report',
  context: { route: '/test', platform: 'web' },
  projectName: 'test-app',
  onClose: jest.fn(),
  onSubmitted: jest.fn(),
};

describe('BugReportModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ issueUrl: 'https://github.com/test/issues/1' }),
    });
  });

  it('should not render when visible is false', () => {
    const { container } = render(
      <BugReportModal {...defaultProps} visible={false} />
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('should render modal with screenshot preview when visible', () => {
    render(<BugReportModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeTruthy();
    const img = screen.getByAltText('Screenshot');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('data:image/png;base64,abc123');
  });

  it('should have an editable description text input', () => {
    render(<BugReportModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('Describe the bug...');
    fireEvent.change(input, { target: { value: 'Button is misaligned' } });
    expect((input as HTMLTextAreaElement).value).toBe('Button is misaligned');
  });

  it('should POST payload to webhookUrl on submit', async () => {
    render(<BugReportModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('Describe the bug...');
    fireEvent.change(input, { target: { value: 'Something broke' } });

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/api/bug-report',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Something broke'),
        }),
      );
    });
  });

  it('should call onClose and onSubmitted after successful submit', async () => {
    render(<BugReportModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('Describe the bug...');
    fireEvent.change(input, { target: { value: 'Bug description' } });

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(defaultProps.onSubmitted).toHaveBeenCalledWith('https://github.com/test/issues/1');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('should call onClose when cancel is clicked without submitting', () => {
    render(<BugReportModal {...defaultProps} />);

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);

    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle non-JSON success response without crashing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    });

    render(<BugReportModal {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Describe the bug...'), {
      target: { value: 'A bug' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(defaultProps.onSubmitted).not.toHaveBeenCalled();
    });
  });

  it('should handle JSON response missing issueUrl', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    });

    render(<BugReportModal {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Describe the bug...'), {
      target: { value: 'A bug' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(defaultProps.onClose).toHaveBeenCalled();
      expect(defaultProps.onSubmitted).not.toHaveBeenCalled();
    });
  });

  it('should use custom onSubmit when provided', async () => {
    const customSubmit = jest.fn().mockResolvedValue({ issueUrl: 'https://custom.com/1' });

    render(<BugReportModal {...defaultProps} onSubmit={customSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('Describe the bug...'), {
      target: { value: 'Custom submit bug' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(customSubmit).toHaveBeenCalledWith({
        description: 'Custom submit bug',
        screenshot: defaultProps.screenshot,
        context: defaultProps.context,
        projectName: defaultProps.projectName,
      });
      expect(mockFetch).not.toHaveBeenCalled();
      expect(defaultProps.onSubmitted).toHaveBeenCalledWith('https://custom.com/1');
    });
  });

  it('should show error when custom onSubmit rejects', async () => {
    const customSubmit = jest.fn().mockRejectedValue(new Error('Auth failed'));

    render(<BugReportModal {...defaultProps} onSubmit={customSubmit} />);
    fireEvent.change(screen.getByPlaceholderText('Describe the bug...'), {
      target: { value: 'Bug' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => {
      expect(screen.getByTestId('submit-error')).toBeTruthy();
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });
});
