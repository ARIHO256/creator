import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import type { PageId } from "../layouts/CreatorShellLayout";
import { useScrollLock } from "../hooks/useScrollLock";

type AvatarMenuDropdownProps = {
  userName?: string;
  onChangePage?: (page: PageId) => void;
  onViewEarnings?: () => void;
  onOpenCommand?: () => void;
  onLogout?: () => void;
};

export const AvatarMenuDropdown: React.FC<AvatarMenuDropdownProps> = ({
  userName = "Ronald",
  onChangePage,
  onViewEarnings,
  onOpenCommand,
  onLogout
}) => {
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === "dark";
  const [open, setOpen] = useState<boolean>(false);
  const [dnd, setDnd] = useState<boolean>(false);
  // Removed showShortcuts state
  const [showSignOutConfirm, setShowSignOutConfirm] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Lock background scroll when open
  useScrollLock(open);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1280);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  // Removed shortcuts logic

  const cardBg = darkMode
    ? "bg-slate-900 border-slate-800 text-slate-50"
    : "bg-white border-slate-200 text-slate-900";
  const muted = darkMode ? "text-slate-400" : "text-slate-500";

  const handleViewEarnings = () => {
    setOpen(false);
    onViewEarnings?.();
  };

  const handleChangePage = (page: PageId) => {
    setOpen(false);
    onChangePage?.(page);
  };

  return (
    <div className="relative z-50">
      <button
        ref={btnRef}
        type="button"
        className={`h-9 rounded-full px-1.5 flex items-center gap-2 transition-colors cursor-pointer ${darkMode
          ? "bg-slate-900 border border-slate-800 hover:bg-slate-800"
          : "bg-white border border-slate-200 hover:bg-slate-50"
          }`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className={`h-7 w-7 rounded-full flex-shrink-0 ${darkMode ? "bg-slate-700" : "bg-slate-200"} flex items-center justify-center text-xs font-semibold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
          RI
        </div>
        <span className={`hidden sm:inline text-md font-medium ${darkMode ? "text-slate-100" : "text-slate-800"}`}>
          {userName}
        </span>
        <span className={`text-xs ${muted} flex-shrink-0`}>▾</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          className={`absolute right-0 top-full mt-2 w-[340px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-140px)] rounded-2xl border-2 shadow-2xl z-[9999] ${cardBg} overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200`}
          role="menu"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Profile header - Fixed at top */}
          <div
            className={`p-3 ${darkMode ? "bg-slate-900" : "bg-slate-50"} border-b ${darkMode ? "border-slate-800" : "border-slate-200"
              } flex-shrink-0`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                <div className={`h-10 w-10 rounded-full flex-shrink-0 ${darkMode ? "bg-slate-700" : "bg-slate-200"} flex items-center justify-center text-sm font-semibold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                  RI
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="text-md font-semibold truncate dark:text-slate-100">
                    {userName} Isabirye
                  </div>
                  <div className={`text-sm ${muted} truncate`}>
                    @{userName.toLowerCase()}.creates · Silver Tier · KYC Verified
                  </div>
                </div>
              </div>
              <button
                className={`px-2.5 py-1 rounded-full text-sm transition-colors whitespace-nowrap flex-shrink-0 ml-2 ${darkMode
                  ? "bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-100"
                  : "bg-white border border-slate-200 hover:bg-slate-50 text-slate-900"
                  }`}
                onClick={() => handleChangePage("profile-public")}
              >
                View profile
              </button>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2">
              <MiniStat label="This month" value="$1,430" darkMode={darkMode} />
              <MiniStat label="Open proposals" value="4" darkMode={darkMode} />
              <MiniStat label="Following" value="18" darkMode={darkMode} />
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="overflow-y-auto overflow-x-hidden flex-1 min-h-0">
            {/* Quick actions */}
            <div className="p-3">
              <div className="grid grid-cols-3 gap-2">
                <QuickMenuBtn
                  label="My Day"
                  icon="✅"
                  onClick={() => handleChangePage("shell")}
                  primary={false}
                  darkMode={darkMode}
                />
                <QuickMenuBtn
                  label="Earnings"
                  icon="💰"
                  onClick={handleViewEarnings}
                  primary={true}
                  darkMode={darkMode}
                />
                <QuickMenuBtn
                  label="Switch role"
                  icon="🔁"
                  onClick={() => handleChangePage("roles")}
                  primary={false}
                  darkMode={darkMode}
                />
              </div>
            </div>

            <Divider darkMode={darkMode} />

            {/* Workspace shortcuts */}
            <MenuSection title="Workspace" darkMode={darkMode}>
              <MenuItem
                label="Campaigns Board"
                hint="Pipeline"
                onClick={() => handleChangePage("creator-campaigns")}
                darkMode={darkMode}
              />
              <MenuItem
                label="Proposals"
                hint="Inbox"
                onClick={() => handleChangePage("proposals")}
                darkMode={darkMode}
              />
              <MenuItem
                label="Adz dashboard"
                hint="Links & performance"
                onClick={() => handleChangePage("AdzDashboard")}
                darkMode={darkMode}
              />
              <MenuItem
                label="Live Studio"
                hint="Go live"
                onClick={() => handleChangePage("live-studio")}
                darkMode={darkMode}
              />
              <MenuItem
                label="Reviews"
                hint="Audience feedback"
                onClick={() => handleChangePage("reviews")}
                darkMode={darkMode}
              />
            </MenuSection>

            <Divider darkMode={darkMode} />

            {/* Account */}
            <MenuSection title="Account" darkMode={darkMode}>
              <MenuItem
                label="Host settings"
                hint="Profile, preferences"
                onClick={() => handleChangePage("settings")}
                darkMode={darkMode}
              />
              <MenuItem
                label="Subscription"
                hint="Plan & billing"
                onClick={() => handleChangePage("subscription")}
                darkMode={darkMode}
              />
              <MenuItem
                label="Security & devices"
                hint="2FA, sessionz"
                onClick={() => {
                  setOpen(false);
                  onChangePage?.("settings");
                  // Set hash after navigation
                  setTimeout(() => {
                    window.location.hash = 'security';
                  }, 100);
                }}
                darkMode={darkMode}
              />
              <MenuItem
                label="Payout methods"
                hint="Bank, wallet"
                onClick={() => {
                  setOpen(false);
                  onChangePage?.("settings");
                  // Payout methods are in the settings page under profile/account section
                  setTimeout(() => {
                    window.location.hash = 'profile';
                  }, 100);
                }}
                darkMode={darkMode}
              />
              <MenuItem
                label="Notifications"
                hint={dnd ? "Do not disturb on" : "Live alerts"}
                onClick={() => {
                  setOpen(false);
                  onChangePage?.("settings");
                  setTimeout(() => {
                    window.location.hash = 'notifications';
                  }, 100);
                }}
                darkMode={darkMode}
              />
            </MenuSection>

            <Divider darkMode={darkMode} />

            {/* Toggles */}
            <div className="p-3 flex flex-col gap-2">
              <ToggleRow
                label="Dark mode"
                value={darkMode}
                onChange={toggleTheme}
                darkMode={darkMode}
              />
              <ToggleRow
                label="Do not disturb"
                value={dnd}
                onChange={() => setDnd((v) => !v)}
                darkMode={darkMode}
              />
            </div>

            <Divider darkMode={darkMode} />

            {/* Support + sign out */}
            <MenuSection title="Support" darkMode={darkMode}>
              <MenuItem
                label="Contact Host Success"
                hint="Priority support"
                onClick={() => {
                  window.location.href = "mailto:support@mylivedealz.com?subject=Host Support Request";
                  setOpen(false);
                }}
                darkMode={darkMode}
              />
              <MenuItem
                label="Help center"
                hint="Guides"
                onClick={() => {
                  setOpen(false);
                  onChangePage?.("settings");
                  setTimeout(() => {
                    window.location.hash = 'help';
                    // Fallback scroll if hash doesn't trigger automatically
                    const el = document.getElementById('help');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }, 100);
                }}
                darkMode={darkMode}
              />
              <MenuItem
                label="Keyboard shortcuts"
                hint="Ctrl+K"
                onClick={() => {
                  setOpen(false);
                  onOpenCommand?.();
                }}
                darkMode={darkMode}
              />
            </MenuSection>

            <div className="p-3">
              {showSignOutConfirm ? (
                <div className="space-y-2">
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                    Are you sure you want to sign out?
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
                      onClick={() => {
                        setShowSignOutConfirm(false);
                        setOpen(false);
                        onLogout?.();
                      }}
                    >
                      Yes, sign out
                    </button>
                    <button
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${darkMode
                        ? "bg-slate-800 hover:bg-slate-700 text-slate-100"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-900"
                        }`}
                      onClick={() => setShowSignOutConfirm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className={`w-full px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${darkMode
                    ? "bg-slate-950 border border-slate-800 text-slate-100 hover:bg-slate-900"
                    : "bg-white border border-slate-200 hover:bg-slate-50"
                    }`}
                  onClick={() => setShowSignOutConfirm(true)}
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type DividerProps = {
  darkMode: boolean;
};

function Divider({ darkMode }: DividerProps) {
  return <div className={`h-px ${darkMode ? "bg-slate-800" : "bg-slate-200"}`} />;
}

type MenuSectionProps = {
  title: string;
  children: React.ReactNode;
  darkMode: boolean;
};

function MenuSection({ title, children, darkMode }: MenuSectionProps) {
  return (
    <div className="px-3 py-2">
      <div
        className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-slate-500"
          } mb-1`}
      >
        {title}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

type MenuItemProps = {
  label: string;
  hint?: string;
  onClick: () => void;
  darkMode: boolean;
};

function MenuItem({ label, hint, onClick, darkMode }: MenuItemProps) {
  return (
    <button
      className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between text-sm transition-colors ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-50"
        }`}
      onClick={onClick}
      role="menuitem"
    >
      <span className="font-medium dark:text-slate-100">{label}</span>
      {hint ? <span className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{hint}</span> : null}
    </button>
  );
}

type ToggleRowProps = {
  label: string;
  value: boolean;
  onChange: () => void;
  darkMode: boolean;
};

function ToggleRow({ label, value, onChange, darkMode }: ToggleRowProps) {
  return (
    <button
      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl transition-colors ${darkMode ? "hover:bg-slate-800" : "hover:bg-slate-50"
        }`}
      onClick={onChange}
      type="button"
    >
      <span className="text-sm font-medium dark:text-slate-100">{label}</span>
      <span
        className={`h-5 w-9 rounded-full border flex items-center px-0.5 transition-colors ${value
          ? "bg-[#f77f00] border-[#f77f00]"
          : darkMode
            ? "bg-slate-950 border-slate-700"
            : "bg-slate-100 border-slate-200"
          }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white transition-transform ${value ? "translate-x-4" : "translate-x-0"
            }`}
        />
      </span>
    </button>
  );
}

type MiniStatProps = {
  label: string;
  value: string;
  darkMode: boolean;
};

function MiniStat({ label, value, darkMode }: MiniStatProps) {
  return (
    <div
      className={`rounded-xl border p-2 ${darkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200"
        }`}
    >
      <div className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>{label}</div>
      <div className="text-md font-semibold dark:text-slate-100">{value}</div>
    </div>
  );
}

type QuickMenuBtnProps = {
  label: string;
  icon: string;
  onClick: () => void;
  primary?: boolean;
  darkMode: boolean;
};

function QuickMenuBtn({ label, icon, onClick, primary, darkMode }: QuickMenuBtnProps) {
  return (
    <button
      className={`px-2.5 py-2 rounded-2xl border text-left flex flex-col gap-0.5 transition-colors ${primary
        ? "bg-[#f77f00] border-[#f77f00] text-white hover:bg-[#e26f00]"
        : darkMode
          ? "bg-slate-950 border-slate-800 text-slate-100 hover:bg-slate-900"
          : "bg-white border-slate-200 hover:bg-slate-50"
        }`}
      onClick={onClick}
      type="button"
    >
      <div className="text-md">{icon}</div>
      <div className="text-sm font-semibold">{label}</div>
    </button>
  );
}
