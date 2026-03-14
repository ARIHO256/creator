import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { useLocalization } from "../../localization/LocalizationProvider";

type ToastVariant = "success" | "error" | "warning" | "info";

export type Toast = {
  id?: number;
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
};

type ToastWithId = Toast & { id: number };

type ToastContextValue = {
  showToast: (toast: Toast) => void;
  hideToast: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastWithId[]>([]);

  const showToast = useCallback((toast: Toast) => {
    const id = toast.id ?? idCounter++;
    const duration = toast.duration ?? 3500;
    setToasts((prev) => [...prev, { id, ...toast }]);
    if (duration > 0) {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const hideToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastWithId[]; onDismiss: (id: number) => void }) {
  const { t } = useLocalization();
  if (typeof document === "undefined") return null;
  if (!toasts.length) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center space-y-2 sm:items-end sm:px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            "pointer-events-auto flex max-w-sm items-start gap-3 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-gray-900 dark:text-slate-100 shadow-soft-card ring-1 ring-slate-400/15 dark:ring-slate-500/30"
          )}
          role="status"
        >
          <div
            className={clsx(
              "mt-0.5 h-2 w-2 flex-shrink-0 rounded-full",
              toast.variant === "error"
                ? "bg-red-500"
                : toast.variant === "success"
                ? "bg-ev-green"
                : toast.variant === "warning"
                ? "bg-amber-500"
                : "bg-slate-400 dark:bg-slate-500"
            )}
          />
          <div className="flex-1">
            {toast.title && (
              <p className="text-xs font-semibold text-gray-900 dark:text-slate-100">{toast.title}</p>
            )}
            {toast.description && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{toast.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-800 hover:text-gray-900 dark:text-slate-100 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 dark:focus-visible:ring-slate-500/50"
            aria-label={t("Dismiss notification")}
          >
            ×
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}

export default ToastProvider;
