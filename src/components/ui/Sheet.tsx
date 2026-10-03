import type { ReactNode } from 'react';
import { useModalDialog } from '../../hooks/useModalDialog';
import { cn } from '../../utils/cn';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  side: 'left' | 'right';
  /** Id of the element that names the sheet, or a plain label. */
  labelledBy?: string;
  label?: string;
  children: ReactNode;
  className?: string;
}

/** A side panel built on the native modal <dialog>, like Dialog but full height. */
export function Sheet({ open, onClose, side, labelledBy, label, children, className }: SheetProps) {
  const ref = useModalDialog(open);
  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        'fixed inset-y-0 m-0 h-dvh max-h-none w-full overflow-hidden border-border bg-surface p-0 text-fg shadow-pop',
        side === 'right' ? 'sheet-right left-auto right-0 max-w-md border-l' : 'sheet-left right-auto left-0 max-w-[85vw] border-r sm:max-w-xs',
        className,
      )}
    >
      {open && children}
    </dialog>
  );
}
