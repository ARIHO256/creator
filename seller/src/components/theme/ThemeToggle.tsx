import React from "react";
import { useThemeMode, type ThemeMode } from "../../theme/themeMode";

const MODES: ThemeMode[] = ["light", "dark", "system"];

export default function ThemeToggle() {
  const { mode, setMode } = useThemeMode();

  return (
    <div className="inline-flex items-center rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-gray-900 dark:text-slate-100">
      {MODES.map((nextMode) => {
        const active = mode === nextMode;
        return (
          <button
            key={nextMode}
            type="button"
            onClick={() => setMode(nextMode)}
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 dark:focus-visible:ring-slate-500/50",
              active
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-800 hover:text-gray-900 dark:text-slate-100 dark:hover:text-slate-100",
            ].join(" ")}
            aria-pressed={active}
          >
            {nextMode}
          </button>
        );
      })}
    </div>
  );
}
