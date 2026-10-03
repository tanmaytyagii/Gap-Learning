import { useEffect, useRef } from 'react';

/**
 * Opens and closes a native <dialog> as a modal (focus trap, inert page, Escape) and returns
 * focus to whatever was focused before it opened, including when the dialog unmounts while open.
 *
 * React's `autoFocus` fires on mount, before the dialog is shown, so it cannot work inside a
 * dialog; mark the element to focus with `data-autofocus` instead. Without one, the browser
 * focuses the first focusable element.
 */
export function useModalDialog(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && dialog.open) {
      dialog.close();
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
      returnFocus.current = null;
    }
  }, [open]);

  useEffect(() => () => {
    if (returnFocus.current?.isConnected) returnFocus.current.focus();
  }, []);

  return ref;
}
