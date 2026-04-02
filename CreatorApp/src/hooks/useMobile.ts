import { useState, useEffect } from "react";

/**
 * Hook to detect if the current viewport is mobile (width < 768px).
 * Useful for conditional rendering or logic that should only run on mobile.
 */
export function useMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Initial check
        checkIsMobile();

        // Listen for resize events
        window.addEventListener("resize", checkIsMobile);

        return () => {
            window.removeEventListener("resize", checkIsMobile);
        };
    }, []);

    return isMobile;
}
