import { useState } from "react";
import { useNotification } from "../contexts/NotificationContext";

type AsyncActionOptions = {
  successMessage?: string;
  errorMessage?: string;
  delay?: number;
  suppressSuccessToast?: boolean;
  suppressErrorToast?: boolean;
};

type ToastLike = {
  showSuccess?: (message: string) => void;
  showError?: (message: string) => void;
  success?: (message: string) => void;
  error?: (message: string) => void;
};

export function useAsyncAction(toastApi?: ToastLike) {
  const notificationApi = useNotification();
  const [isPending, setIsPending] = useState(false);

  const activeToastApi = toastApi ?? notificationApi;

  const run = async <T>(
    fn: () => Promise<T> | T,
    opts: AsyncActionOptions = {}
  ): Promise<T | null> => {
    const {
      successMessage = "Done",
      errorMessage = "Something went wrong",
      delay = 900,
      suppressSuccessToast = false,
      suppressErrorToast = false,
    } = opts;

    setIsPending(true);
    try {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      const result = await fn();
      if (!suppressSuccessToast) {
        activeToastApi.showSuccess?.(successMessage) ?? activeToastApi.success?.(successMessage);
      }
      return result;
    } catch {
      if (!suppressErrorToast) {
        activeToastApi.showError?.(errorMessage) ?? activeToastApi.error?.(errorMessage);
      }
      return null;
    } finally {
      setIsPending(false);
    }
  };

  return { run, isPending };
}

export default useAsyncAction;

