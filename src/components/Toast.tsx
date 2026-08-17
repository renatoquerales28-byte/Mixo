import React from 'react';
import { useToast, type ToastItem } from '../hooks/useToast';

const typeIcons: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const ToastCard: React.FC<{ toast: ToastItem; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
  const durationStyle = { '--toast-duration': toast.duration + 'ms' } as React.CSSProperties;
  return (
    <div className={`toast-item ${toast.type}`} style={durationStyle}>
      <div className="toast-item-row">
        <span className="toast-icon" style={{ fontSize: '15px', lineHeight: 1, flexShrink: 0, fontWeight: 'bold' }}>
          {typeIcons[toast.type]}
        </span>
        <span style={{ flex: 1, fontSize: '14px', color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
          {toast.message}
        </span>
        <button
          type="button"
          onClick={() => onRemove(toast.id)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text-secondary)',
            fontSize: '18px',
            lineHeight: 1,
            padding: '0',
            flexShrink: 0,
            marginLeft: '8px',
          }}
        >
          ×
        </button>
      </div>
      <div className="toast-progress" />
    </div>
  );
};

export const Toast: React.FC = () => {
  const { toasts, removeToast } = useToast();
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <ToastCard key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};
