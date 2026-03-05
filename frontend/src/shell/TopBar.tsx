
import React, { useState, useRef, useEffect } from "react";
import type { PageId } from "../layouts/CreatorShellLayout";
import { useTheme } from "../contexts/ThemeContext";
import { AvatarMenuDropdown } from "../components/AvatarMenuDropdown";
import { NotificationsPanel } from "../pages/creator/NotificationsPage";
import { useAuth } from "../contexts/AuthContext";
import { useUnreadNotificationsCount } from "../hooks/api/useNotifications";
import {
  Menu,
  Search,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  Verified,
  Globe
} from "lucide-react";

type TopBarProps = {
  onChangePage: (page: PageId) => void;
  onOpenCommand: () => void;
  currentRole: "Creator" | "Seller" | "Buyer" | "Provider";
  onRoleChange: (role: "Creator" | "Seller" | "Buyer" | "Provider") => void;
  activePage?: PageId;
  onOpenMobileMenu?: () => void;
  onViewEarnings?: () => void;
  onLogout?: () => void;
  onSearchRectUpdate?: (rect: DOMRect | null) => void;
};

export const TopBar: React.FC<TopBarProps> = ({
  onChangePage,
  onOpenCommand,
  currentRole,
  onRoleChange,
  onOpenMobileMenu,
  onViewEarnings,
  onLogout,
  onSearchRectUpdate
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, hasApiSession } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsButtonRef = useRef<HTMLButtonElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const unreadNotificationCount = useUnreadNotificationsCount();
  const unreadCount = hasApiSession ? unreadNotificationCount : 3;
  const userName = user?.creatorProfile?.name?.split(" ")[0] ?? "Ronald";
  const isKycVerified = user?.creatorProfile?.isKycVerified ?? true;

  useEffect(() => {
    if (!onSearchRectUpdate || !searchBtnRef.current) return;

    const updateRect = () => {
      if (searchBtnRef.current) {
        onSearchRectUpdate(searchBtnRef.current.getBoundingClientRect());
      }
    };

    // Initial update
    updateRect();

    // Update on resize
    const observer = new ResizeObserver(() => {
      updateRect();
    });

    observer.observe(searchBtnRef.current);
    window.addEventListener("resize", updateRect);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateRect);
    };
  }, [onSearchRectUpdate]); // Only re-run if the callback changes

  return (
    <header className="fixed top-0 left-0 right-0 w-full h-14 flex items-center justify-between px-2 sm:px-4 md:px-6 lg:px-8 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm z-50 transition-colors">
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="xl:hidden h-9 w-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all active:scale-95"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        <div
          className="flex items-center cursor-pointer relative"
          onClick={() => onChangePage("home")}
          aria-label="MyLiveDealz Home"
        >
          {/* Updated Logo: Dual assets for Light/Dark modes */}
          <div className="relative h-9 sm:h-12 md:h-14 w-32 sm:w-48 md:w-56 flex items-center">
            {/* Light Mode Logo (Dark Text) */}
            <img
              src="/MyliveDealz PNG Logo 2 Black.png"
              alt="MyLiveDealz"
              className="h-full w-full object-contain dark:hidden"
            />
            {/* Dark Mode Logo (Light Text) */}
            <img
              src="/MyliveDealz PNG Logo 2 light.png"
              alt="MyLiveDealz"
              className="h-full w-full object-contain hidden dark:block"
            />
          </div>
        </div>
        <RolePill currentRole={currentRole} onRoleChange={onRoleChange} />
      </div>

      {/* Desktop Search Bar */}
      <div className="hidden xl:flex items-center flex-1 max-w-2xl mx-2 lg:mx-4 min-w-0">
        <button
          ref={searchBtnRef}
          type="button"
          onClick={onOpenCommand}
          className="flex items-center flex-1 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full px-3 py-1 text-sm text-slate-500 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-white dark:hover:bg-slate-600 transition-colors min-w-0"
        >
          <span className="flex-1 text-left text-sm truncate">Search…</span>
          <span className="hidden 2xl:inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-900 dark:bg-slate-600 text-slate-100 dark:text-slate-200 flex-shrink-0 ml-2">
            <span className="font-mono">Ctrl</span>
            <span>+</span>
            <span className="font-mono">K</span>
          </span>
          <Search className="ml-2 w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 md:gap-3 text-sm flex-shrink-0">
        {/* Mobile Search Button */}
        <button
          onClick={onOpenCommand}
          className="xl:hidden h-7 w-7 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex-shrink-0"
          aria-label="Search"
          title="Search"
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          onClick={toggleTheme}
          className="hidden xl:inline-flex items-center justify-center h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
        <LanguageCurrencySelector />
        <span className="hidden sm:inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="hidden xl:inline">{isKycVerified ? "KYC Verified" : "KYC pending"}</span>
        </span>
        <button
          ref={notificationsButtonRef}
          className="relative h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex-shrink-0"
          onClick={() => setNotificationsOpen((v) => !v)}
          aria-label="Notifications"
          aria-haspopup="dialog"
          aria-expanded={notificationsOpen}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-evz-orange text-xs text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
        <NotificationsPanel
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          buttonRef={notificationsButtonRef}
          unreadCount={unreadCount}
          onChangePage={onChangePage}
        />
        <AvatarMenuDropdown
          userName={userName}
          onChangePage={onChangePage}
          onViewEarnings={onViewEarnings}
          onOpenCommand={onOpenCommand}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
};

type RolePillProps = {
  currentRole: "Creator" | "Seller" | "Buyer" | "Provider";
  onRoleChange: (role: "Creator" | "Seller" | "Buyer" | "Provider") => void;
};

const RolePill: React.FC<RolePillProps> = ({ currentRole, onRoleChange }) => {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const icon =
    currentRole === "Creator" ? "🎥"
      : currentRole === "Seller" ? "🏪"
        : currentRole === "Buyer" ? "🛒"
          : "🤝"; // Provider

  const handleSelectRole = (role: "Creator" | "Seller" | "Buyer" | "Provider") => {
    if (role === currentRole) return;
    onRoleChange(role);
    setOpen(false);
  };

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const target = e.target as Node;
      const inBtn = btnRef.current?.contains(target);
      const inMenu = menuRef.current?.contains(target);
      if (!inBtn && !inMenu) setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onDocClick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open]);

  // Calculate button position for fixed dropdown
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setButtonRect(rect);
    }
  }, [open]);

  return (
    <div className="relative hidden md:flex text-xs sm:text-sm flex-shrink-0">
      <button
        ref={btnRef}
        type="button"
        className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-slate-100 transition-colors whitespace-nowrap"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{icon}</span>
        <span className="hidden xl:inline">{currentRole}</span>
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>
      {open && buttonRect && (
        <>
          {/* Overlay to capture clicks outside */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={menuRef}
            className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[9999] text-sm overflow-hidden"
            role="menu"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-slate-900 dark:text-slate-100 transition-colors"
              onClick={() => handleSelectRole("Buyer")}
              role="menuitem"
            >
              <span>Switch to Buyer</span>
            </button>
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-slate-900 dark:text-slate-100 transition-colors"
              onClick={() => handleSelectRole("Seller")}
              role="menuitem"
            >
              <span>Switch to Seller</span>
            </button>
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between text-slate-900 dark:text-slate-100 transition-colors"
              onClick={() => handleSelectRole("Provider")}
              role="menuitem"
            >
              <span>Switch to Provider</span>
            </button>
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between disabled:text-slate-400 dark:disabled:text-slate-500 text-slate-900 dark:text-slate-100 transition-colors"
              disabled={currentRole === "Creator"}
              onClick={() => handleSelectRole("Creator")}
              role="menuitem"
            >
              <span>Switch to Creator</span>
              {currentRole === "Creator" && (
                <span className="text-xs text-slate-400 dark:text-slate-500">current</span>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const LanguageCurrencySelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState({
    country: "Uganda",
    language: "EN",
    currency: "USD",
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const countries = [
    { name: "Uganda", code: "UG", flag: "🇺🇬", currency: "UGX" },
    { name: "Kenya", code: "KE", flag: "🇰🇪", currency: "KES" },
    { name: "Tanzania", code: "TZ", flag: "🇹🇿", currency: "TZS" },
    { name: "Nigeria", code: "NG", flag: "🇳🇬", currency: "NGN" },
    { name: "South Africa", code: "ZA", flag: "🇿🇦", currency: "ZAR" },
    { name: "United States", code: "US", flag: "🇺🇸", currency: "USD" },
    { name: "United Kingdom", code: "GB", flag: "🇬🇧", currency: "GBP" },
    { name: "Canada", code: "CA", flag: "🇨🇦", currency: "CAD" },
    { name: "France", code: "FR", flag: "🇫🇷", currency: "EUR" },
    { name: "Germany", code: "DE", flag: "🇩🇪", currency: "EUR" },
    { name: "China", code: "CN", flag: "🇨🇳", currency: "CNY" },
    { name: "India", code: "IN", flag: "🇮🇳", currency: "INR" },
    { name: "Japan", code: "JP", flag: "🇯🇵", currency: "JPY" },
    { name: "Brazil", code: "BR", flag: "🇧🇷", currency: "BRL" },
    { name: "Global", code: "GL", flag: "🌐", currency: "USD" },
  ];

  const languages = ["EN", "FR", "SW", "ES", "DE", "ZH", "JP", "PT"];
  const currencies = ["USD", "EUR", "GBP", "UGX", "KES", "TZS", "NGN", "ZAR", "CAD", "CNY", "INR", "JPY", "BRL"];

  const currentCountry = countries.find((c) => c.name === preferences.country) || countries[0];

  return (
    <div className="relative hidden xl:inline-flex z-50" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
      >
        <span className="text-base leading-none">{currentCountry.flag}</span>
        <span className="hidden xl:inline">
          {preferences.country} / {preferences.language} / {preferences.currency}
        </span>
        <span className="xl:hidden">
          {preferences.language} / {preferences.currency}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 transform origin-top-right transition-all">
          <div className="space-y-4">
            {/* Country Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                Country
              </label>
              <div className="max-h-48 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-2">
                  {countries.map((country) => (
                    <button
                      key={country.name}
                      onClick={() =>
                        setPreferences((prev) => ({
                          ...prev,
                          country: country.name,
                          currency: country.currency, // Auto-switch currency
                        }))
                      }
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors w-full text-left truncate ${preferences.country === country.name
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-medium"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                    >
                      <span className="flex-shrink-0">{country.flag}</span>
                      <span className="truncate">{country.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* Language & Currency Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                  Language
                </label>
                <div className="max-h-32 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-1">
                    {languages.map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setPreferences((prev) => ({ ...prev, language: lang }))}
                        className={`w-full text-center px-2 py-1.5 rounded-md text-xs transition-colors ${preferences.language === lang
                          ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-medium"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                  Currency
                </label>
                <div className="max-h-32 overflow-y-auto pr-1">
                  <div className="grid grid-cols-2 gap-1">
                    {currencies.map((curr) => (
                      <button
                        key={curr}
                        onClick={() => setPreferences((prev) => ({ ...prev, currency: curr }))}
                        className={`w-full text-center px-2 py-1.5 rounded-md text-xs transition-colors ${preferences.currency === curr
                          ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                          }`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
