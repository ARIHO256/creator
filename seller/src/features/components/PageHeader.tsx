import React from "react";

type PageHeaderProps = {
  pageTitle?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  right?: React.ReactNode;
  rightContent?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  onBack?: () => void;
};

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export function PageHeader({
  pageTitle,
  title,
  subtitle,
  badge,
  right,
  rightContent,
  actions,
  className,
  onBack,
}: PageHeaderProps) {
  const heading = pageTitle ?? title;
  const rightNode = rightContent ?? right ?? actions;

  return (
    <header className={cx("sticky top-0 z-30 w-full bg-white/80 dark:bg-slate-950/70 backdrop-blur", className)}>
      <div className="w-full max-w-full px-[0.55%] py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-gray-50 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  aria-label="Back"
                >
                  ←
                </button>
              ) : null}
              {heading ? <h1 className="truncate text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50">{heading}</h1> : null}
            </div>
            {subtitle ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
            {badge ? <div className="mt-1">{badge}</div> : null}
          </div>
          {rightNode ? <div className="shrink-0 flex items-center gap-2">{rightNode}</div> : null}
        </div>
      </div>
    </header>
  );
}

export default PageHeader;
