import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { ConfirmContext, ToastContext, type ConfirmOptions, type ToastInput } from './feedback-context';

// ---- Toasts ------------------------------------------------------------------------------------

interface ToastItem extends ToastInput {
  id: number;
}

const TOAST_ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const TOAST_ICON_STYLES = { success: 'text-success', error: 'text-danger', info: 'text-accent-fg' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const push = useCallback((toast: ToastInput) => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-3), { ...toast, id }]);
    window.setTimeout(() => dismiss(id), toast.tone === 'error' ? 8000 : 4500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((toast) => {
          const tone = toast.tone ?? 'success';
          const Icon = TOAST_ICONS[tone];
          return (
            <div
              key={toast.id}
              role={tone === 'error' ? 'alert' : 'status'}
              className="animate-rise-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-pop"
            >
              <Icon className={cn('mt-0.5 size-4 shrink-0', TOAST_ICON_STYLES[tone])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{toast.title}</p>
                {toast.description && <p className="mt-0.5 text-[13px] leading-5 text-fg-2">{toast.description}</p>}
                {toast.action && (
                  <button
                    type="button"
                    className="mt-1.5 text-[13px] font-medium text-accent-fg hover:underline"
                    onClick={() => {
                      toast.action!.onClick();
                      dismiss(toast.id);
                    }}
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button type="button" onClick={() => dismiss(toast.id)} className="rounded p-0.5 text-fg-3 hover:text-fg" aria-label="Dismiss notification">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// ---- Confirmation dialog ------------------------------------------------------------------------

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (value: boolean) => void }) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => {
    setPending({ ...options, resolve });
  }), []);

  const settle = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  const value = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Dialog
        open={pending !== null}
        onClose={() => settle(false)}
        title={pending?.title ?? ''}
        description={pending?.description}
        size="sm"
        footer={(
          <>
            <Button onClick={() => settle(false)}>Cancel</Button>
            <Button variant={pending?.destructive ? 'destructive' : 'primary'} onClick={() => settle(true)} data-autofocus>
              {pending?.confirmLabel}
            </Button>
          </>
        )}
      />
    </ConfirmContext.Provider>
  );
}
