import { useState, useCallback } from "react";
import { useNotification } from "../contexts/NotificationContext";

interface AsyncActionOptions {
    successMessage?: string;
    errorMessage?: string;
    loadingMessage?: string;
    showSuccess?: boolean;
    showError?: boolean;
    delay?: number; // Simulated delay for "Real Data" feel
}

/**
 * useAsyncAction
 * --------------
 * A professional, reusable hook to handle async operations project-wide.
 * 
 * Features:
 * 1. Automatic loading state management.
 * 2. Automatic error catching and global toast notifications.
 * 3. Automatic success feedback.
 * 4. Simulated delay to give a "Real Data/Network" feel.
 * 5. Optional loading/pending message.
 */
export function useAsyncAction() {
    const [isPending, setIsPending] = useState(false);
    const { showSuccess, showError, showNotification } = useNotification();

    const run = useCallback(async <T>(
        action: () => Promise<T>,
        options: AsyncActionOptions = {}
    ): Promise<T | null> => {
        const {
            successMessage,
            errorMessage = "An unexpected error occurred. Please try again.",
            loadingMessage,
            showSuccess: shouldShowSuccess = true,
            showError: shouldShowError = true,
            delay = 1000 // Default 1s delay for professional feel
        } = options;

        setIsPending(true);
        if (loadingMessage) {
            showNotification(loadingMessage);
        }

        try {
            // 1. Simulate Network Delay
            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            // 2. Execute the Action
            const result = await action();

            // 3. Handle Success
            if (shouldShowSuccess && successMessage) {
                showSuccess(successMessage);
            }

            return result;
        } catch (err) {
            // 4. Handle Error
            console.error("Async action failed:", err);
            if (shouldShowError) {
                showError(errorMessage);
            }
            return null;
        } finally {
            setIsPending(false);
        }
    }, [showSuccess, showError, showNotification]);

    return { run, isPending };
}
