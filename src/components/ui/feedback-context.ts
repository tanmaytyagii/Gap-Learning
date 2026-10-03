import { createContext, useContext, type ReactNode } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
}

export interface ConfirmOptions {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
}

export const ToastContext = createContext<(toast: ToastInput) => void>(() => {});
export const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(async () => false);

export function useToast() {
  return useContext(ToastContext);
}

/** Returns a function that opens a confirmation dialog and resolves to the learner's choice. */
export function useConfirm() {
  return useContext(ConfirmContext);
}
