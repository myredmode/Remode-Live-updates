import React, { useState, useRef, useEffect } from 'react';
import {
  Check,
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
  Info,
  X,
  MinusCircle,
  AlertTriangle,
} from 'lucide-react';

export type SaveButtonState = 'idle' | 'saving' | 'saved' | 'error';
export type TestButtonState = 'idle' | 'testing' | 'connected' | 'failed';
export type IntegrationConnectionStatus =
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'testing'
  | 'saving'
  | 'inactive'
  | 'setup';

/**
 * Compact, consistent connection & automation status indicator shared across all API integration panels.
 * Uses icon + text (never color alone) with subtle hairline styling.
 */
interface IntegrationStatusIndicatorProps {
  status: IntegrationConnectionStatus;
  label?: string;
  title?: string;
}

export const IntegrationStatusIndicator: React.FC<IntegrationStatusIndicatorProps> = ({
  status,
  label,
  title,
}) => {
  const config: Record<
    IntegrationConnectionStatus,
    { defaultLabel: string; classes: string; icon: React.ReactNode }
  > = {
    connected: {
      defaultLabel: 'Connected',
      classes: 'bg-emerald-50/80 text-emerald-800 border-emerald-200',
      icon: <Wifi className="w-3 h-3 text-emerald-600 shrink-0" />,
    },
    disconnected: {
      defaultLabel: 'Disconnected',
      classes: 'bg-slate-50 text-slate-600 border-slate-200',
      icon: <WifiOff className="w-3 h-3 text-slate-400 shrink-0" />,
    },
    error: {
      defaultLabel: 'Error',
      classes: 'bg-rose-50/90 text-rose-700 border-rose-200',
      icon: <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />,
    },
    testing: {
      defaultLabel: 'Testing',
      classes: 'bg-slate-50 text-slate-700 border-slate-200',
      icon: <Loader2 className="w-3 h-3 text-slate-600 animate-spin shrink-0" />,
    },
    saving: {
      defaultLabel: 'Saving',
      classes: 'bg-slate-50 text-slate-700 border-slate-200',
      icon: <Loader2 className="w-3 h-3 text-slate-600 animate-spin shrink-0" />,
    },
    inactive: {
      defaultLabel: 'Inactive',
      classes: 'bg-slate-50 text-slate-600 border-slate-200',
      icon: <MinusCircle className="w-3 h-3 text-slate-400 shrink-0" />,
    },
    setup: {
      defaultLabel: 'Needs Setup',
      classes: 'bg-amber-50/80 text-amber-800 border-amber-200',
      icon: <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />,
    },
  };

  const item = config[status];

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border whitespace-nowrap ${item.classes}`}
    >
      {item.icon}
      <span>{label || item.defaultLabel}</span>
    </span>
  );
};

/**
 * Compact inline tooltip trigger for essential field instructions without cluttering the form layout.
 */
interface IntegrationInfoTipProps {
  text: string;
}

export const IntegrationInfoTip: React.FC<IntegrationInfoTipProps> = ({ text }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <span
      ref={containerRef}
      className="relative inline-flex items-center align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label={text}
        className="text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded cursor-pointer p-0.5 transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 sm:left-1/2 sm:-translate-x-1/2 bottom-full mb-1.5 z-30 w-60 max-w-[80vw] rounded-lg bg-slate-900 text-white text-[11px] leading-relaxed font-normal px-2.5 py-2 shadow-lg pointer-events-none"
        >
          {text}
        </span>
      )}
    </span>
  );
};

/**
 * Universal Save Changes button with inline spinner, success check, and error states.
 * Maintains fixed minimum width so transitions never cause horizontal layout jitter.
 */
interface SaveChangesButtonProps {
  state: SaveButtonState;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}

export const SaveChangesButton: React.FC<SaveChangesButtonProps> = ({
  state,
  onClick,
  disabled = false,
  label = 'Save Changes',
}) => {
  const isBusy = state === 'saving';

  const variantClasses =
    state === 'saved'
      ? 'bg-emerald-600 border-emerald-600 text-white'
      : state === 'error'
      ? 'bg-rose-600 hover:bg-rose-700 border-rose-600 text-white'
      : state === 'saving'
      ? 'bg-slate-800 border-slate-800 text-white cursor-wait'
      : 'bg-slate-900 hover:bg-black border-slate-900 text-white';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isBusy}
      aria-live="polite"
      className={`h-9 min-w-[130px] px-4 border rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 cursor-pointer disabled:opacity-60 ${variantClasses}`}
    >
      {state === 'saving' ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>Saving...</span>
        </>
      ) : state === 'saved' ? (
        <>
          <Check className="w-3.5 h-3.5 shrink-0" />
          <span>Saved!</span>
        </>
      ) : state === 'error' ? (
        <>
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Save Failed</span>
        </>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
};

/**
 * Universal Test Connection secondary/outline button with inline testing, connected, and failed states.
 */
interface TestConnectionButtonProps {
  state: TestButtonState;
  onClick: () => void;
  disabled?: boolean;
}

export const TestConnectionButton: React.FC<TestConnectionButtonProps> = ({
  state,
  onClick,
  disabled = false,
}) => {
  const isBusy = state === 'testing';

  const variantClasses =
    state === 'connected'
      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
      : state === 'failed'
      ? 'bg-rose-50 border-rose-300 text-rose-700'
      : state === 'testing'
      ? 'bg-slate-50 border-slate-300 text-slate-700 cursor-wait'
      : 'bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-800';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isBusy}
      aria-live="polite"
      className={`h-9 min-w-[136px] px-3.5 border rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 cursor-pointer disabled:opacity-60 ${variantClasses}`}
    >
      {state === 'testing' ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>Testing...</span>
        </>
      ) : state === 'connected' ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Connected</span>
        </>
      ) : state === 'failed' ? (
        <>
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Connection Failed</span>
        </>
      ) : (
        <span>Test Connection</span>
      )}
    </button>
  );
};

/**
 * Compact inline feedback area placed directly underneath the action row for real error messages
 * or concise test result details without scrolling or top-of-page banners.
 */
interface InlineActionFeedbackProps {
  type: 'error' | 'success';
  message: string;
  onDismiss?: () => void;
}

export const InlineActionFeedback: React.FC<InlineActionFeedbackProps> = ({
  type,
  message,
  onDismiss,
}) => {
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`px-3 py-2.5 rounded-lg border text-xs flex items-start justify-between gap-2.5 ${
        type === 'error'
          ? 'bg-rose-50/90 border-rose-200 text-rose-800'
          : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
      }`}
    >
      <div className="flex items-start gap-2 min-w-0">
        {type === 'error' ? (
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
        ) : (
          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
        )}
        <span className="leading-relaxed break-words">{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

/**
 * Clean, consistent list row for automation triggers across WhatsApp & SMS integrations.
 */
interface AutomationToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const AutomationToggleRow: React.FC<AutomationToggleRowProps> = ({
  title,
  description,
  checked,
  onChange,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 py-3 px-3.5 first:rounded-t-lg last:rounded-b-lg hover:bg-slate-50/70 transition-colors">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-900">{title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{description}</p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <span
          className={`text-[11px] font-medium tabular-nums ${
            checked ? 'text-emerald-700' : 'text-slate-400'
          }`}
        >
          {checked ? 'Enabled' : 'Disabled'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={`${title} (${checked ? 'Enabled' : 'Disabled'})`}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 cursor-pointer ${
            checked ? 'bg-slate-900' : 'bg-slate-200'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform duration-150 ${
              checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
