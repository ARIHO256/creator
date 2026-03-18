// Reusable Tooltip component for showing full content on hover
import React, { useState, useRef, useEffect } from "react";

type TooltipProps = {
    content: string;
    children: React.ReactNode;
    className?: string;
};

export function Tooltip({ content, children, className = "" }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isVisible && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setPosition({
                top: rect.top - 8,
                left: rect.left + rect.width / 2,
            });
        }
    }, [isVisible]);

    return (
        <div
            ref={triggerRef}
            className={`relative inline-block ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
            onTouchStart={() => setIsVisible(true)}
            onTouchEnd={() => setTimeout(() => setIsVisible(false), 2000)}
        >
            {children}
            {isVisible && (
                <div
                    className="fixed z-50 px-3 py-2 text-sm bg-slate-900 dark:bg-slate-700 text-white rounded-lg shadow-lg max-w-xs whitespace-normal break-words"
                    style={{
                        top: `${position.top}px`,
                        left: `${position.left}px`,
                        transform: "translate(-50%, -100%)",
                    }}
                >
                    <div className="relative">
                        {content}
                        <div
                            className="absolute w-2 h-2 bg-slate-900 dark:bg-slate-700 transform rotate-45"
                            style={{
                                bottom: "-4px",
                                left: "50%",
                                marginLeft: "-4px",
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
