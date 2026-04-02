import { useCallback } from "react";
import type { ReactNode } from "react";
import { useToast } from "../../components/ui/ToastProvider";

export type NotificationTone = "success" | "error" | "warning" | "info";

type NotifyArgs = {
  title?: ReactNode;
  message: ReactNode;
  tone?: NotificationTone;
};

export function useNotification() {
  const { showToast } = useToast();

  const push = useCallback(
    ({ title, message, tone = "info" }: NotifyArgs) => {
      showToast({
        title,
        description: message,
        variant: tone,
      });
    },
    [showToast]
  );

  const showNotification = useCallback(
    (message: ReactNode, tone: NotificationTone = "info", title?: ReactNode) => {
      push({ title, message, tone });
    },
    [push]
  );

  const showSuccess = useCallback(
    (message: ReactNode, title?: ReactNode) => {
      push({ title, message, tone: "success" });
    },
    [push]
  );

  const showError = useCallback(
    (message: ReactNode, title?: ReactNode) => {
      push({ title, message, tone: "error" });
    },
    [push]
  );

  const showWarning = useCallback(
    (message: ReactNode, title?: ReactNode) => {
      push({ title, message, tone: "warning" });
    },
    [push]
  );

  const showInfo = useCallback(
    (message: ReactNode, title?: ReactNode) => {
      push({ title, message, tone: "info" });
    },
    [push]
  );

  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo,
  };
}

