/**
 * BugReportModal — modal form for submitting bug reports.
 */

import React, { useState } from 'react';

function safeStringify(obj: unknown): string {
  const seen = new WeakSet();
  try {
    return JSON.stringify(obj, (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      return value;
    });
  } catch {
    return JSON.stringify({ error: 'Bug report context could not be serialized' });
  }
}

export interface BugReportModalProps {
  visible: boolean;
  screenshot: string | null;
  webhookUrl: string;
  context: Record<string, unknown>;
  projectName: string;
  onClose: () => void;
  onSubmitted?: (issueUrl: string) => void;
}

const BugReportModal: React.FC<BugReportModalProps> = ({
  visible,
  screenshot,
  webhookUrl,
  context,
  projectName,
  onClose,
  onSubmitted,
}) => {
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!visible) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({
          description,
          screenshot,
          context,
          projectName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onSubmitted?.(data.issueUrl);
        setDescription('');
        onClose();
      } else {
        setError('Failed to submit bug report. Please try again.');
      }
    } catch {
      setError('Network error — could not reach the server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Report a Bug</h2>

        {screenshot && (
          <img
            src={screenshot}
            alt="Screenshot"
            style={styles.screenshot}
          />
        )}

        <textarea
          placeholder="Describe the bug..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={styles.textarea}
          rows={3}
        />

        {error && (
          <div data-testid="submit-error" style={styles.error}>{error}</div>
        )}

        <div style={styles.buttons}>
          <button
            onClick={onClose}
            style={styles.cancelButton}
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={styles.submitButton}
            type="button"
          >
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    maxWidth: 400,
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: 18,
    fontWeight: 600,
  },
  screenshot: {
    width: '100%',
    borderRadius: 8,
    marginBottom: 12,
    border: '1px solid #e0e0e0',
  },
  textarea: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    border: '1px solid #ccc',
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    marginBottom: 12,
  },
  buttons: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #ccc',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: 14,
  },
  error: {
    color: '#D32F2F',
    fontSize: 13,
    marginBottom: 12,
  },
  submitButton: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    backgroundColor: '#E53935',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
  },
};

export default BugReportModal;
