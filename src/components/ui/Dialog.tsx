import { useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useModalDialog } from '../../hooks/useModalDialog';
import { cn } from '../../utils/cn';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Prevents closing by Escape or backdrop click, e.g. while a request is running. */
  busy?: boolean;
}

const WIDTHS = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

/**
 * Modal built on the native <dialog> element, which provides focus trapping, Escape handling,
 * and an inert background for free.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', busy = false }: DialogProps) {
  const ref = useModalDialog(open);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !busy) onClose();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-xl border border-border bg-surface p-0 text-fg shadow-pop',
        'max-h-[calc(100dvh-2rem)] overflow-hidden backdrop:bg-transparent',
        WIDTHS[size],
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold">{title}</h2>
              {description && <p id={descriptionId} className="mt-1 text-[13px] leading-5 text-fg-3">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="-mr-1.5 -mt-1 rounded-md p-1.5 text-fg-3 hover:bg-surface-2 hover:text-fg disabled:opacity-50"
              aria-label="Close dialog"
            >
              <X className="size-4" />
            </button>
          </div>
          {children && <div className="relative overflow-y-auto px-5 py-4">{children}</div>}
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-surface-2/50 px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
