import React from "react";

type PageHeaderProps = {
  pageTitle: string;
  badge?: React.ReactNode;

  rightContent?: React.ReactNode;
  className?: string;
  mobileViewType?: "menu" | "inline-right" | "hide";
  mobileHideBadge?: boolean;
};


export const PageHeader: React.FC<PageHeaderProps> = ({
  pageTitle,
  badge,
  rightContent,
  className = "",
  mobileViewType = "menu", // Default to existing behavior
  mobileHideBadge = false
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
        btnRef.current && !btnRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const hasRightSide = badge || rightContent;

  return (
    <header className={`relative z-[38] h-16 w-full flex items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8 pt-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors shadow-sm ${className}`}>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <img
          src="/MyliveDealz PNG Icon 1.png"
          alt="MyLiveDealz"
          className="h-7 w-7 sm:h-8 sm:w-8 object-contain flex-shrink-0"
        />
        <span className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-50">
          {pageTitle}
        </span>
      </div>
      {hasRightSide && (
        <>
          {/* Desktop/Tablet View: Show content as is */}
          <div className="hidden xl:flex items-center gap-3 text-sm flex-shrink-0">
            {badge}
            {rightContent}
          </div>

          {/* Mobile View: Controlled by mobileViewType */}
          <div className="xl:hidden relative">
            {mobileViewType === "hide" ? null : mobileViewType === "inline-right" ? (
              <div className="flex items-center gap-2">
                {rightContent}
              </div>
            ) : (
              // Default 'menu' behavior
              <>
                <button
                  ref={btnRef}
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="12" r="1" />
                    <circle cx="5" cy="12" r="1" />
                  </svg>
                </button>

                {menuOpen && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden flex flex-col p-1.5"
                  >
                    {badge && !mobileHideBadge && (
                      <div className="flex flex-col w-full mb-1.5 last:mb-0 [&_button]:!w-full [&_button]:!px-3.5 [&_button]:!py-3 [&_button]:!rounded-xl [&_button]:!text-left [&_button]:!flex [&_button]:!items-center [&_button]:!gap-2">
                        {React.cloneElement(badge as React.ReactElement, {
                          className: `${(badge as React.ReactElement).props.className || ""} !flex !flex-col !w-full !gap-1.5 !px-0 !py-0 !bg-transparent !border-none !shadow-none`.replace(/\bhidden\b/g, "")
                        })}
                      </div>
                    )}
                    {rightContent && (
                      <div className="flex flex-col w-full gap-1.5 [&_button]:!w-full [&_button]:!px-3.5 [&_button]:!py-3 [&_button]:!rounded-xl [&_button]:!text-left [&_button]:!flex [&_button]:!items-center [&_button]:!gap-2 transition-colors">
                        {rightContent}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </header>
  );
};
