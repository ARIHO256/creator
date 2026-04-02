import { useEffect } from 'react';

/**
 * Custom hook to lock the background body scroll.
 * Useful for modals, drawers, and full-screen dropdowns.
 * @param isLocked - Boolean to trigger the scroll lock.
 */
export const useScrollLock = (isLocked: boolean) => {
    useEffect(() => {
        if (isLocked) {
            // Prevent background scrolling
            const originalStyle = window.getComputedStyle(document.body).overflow;
            const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

            document.body.style.overflow = 'hidden';

            // Add padding to prevent layout shift if scrollbar disappears
            if (scrollBarWidth > 0) {
                document.body.style.paddingRight = `${scrollBarWidth}px`;
            }

            return () => {
                document.body.style.overflow = originalStyle;
                document.body.style.paddingRight = '';
            };
        }
    }, [isLocked]);
};
