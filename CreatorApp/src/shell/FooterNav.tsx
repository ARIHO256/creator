import React from "react";
import type { PageId } from "../layouts/CreatorShellLayout";
import {
  Home,
  CheckSquare,
  Video,
  DollarSign,
  User
} from "lucide-react";

type FooterNavProps = {
  activePage: PageId;
  onChangePage: (page: PageId) => void;
};

type FooterItem = {
  id: PageId | "go-live";
  label: string;
  icon: React.ElementType;
};

export const FooterNav: React.FC<FooterNavProps> = ({ activePage, onChangePage }) => {
  const navItems: FooterItem[] = [
    { id: "home", label: "Home", icon: Home },
    { id: "shell", label: "My Day", icon: CheckSquare },
    { id: "go-live", label: "Go Live", icon: Video },
    { id: "earnings", label: "Earnings", icon: DollarSign },
    { id: "settings", label: "Profile", icon: User }
  ];

  return (
    <nav className="xl:hidden fixed bottom-0 left-0 right-0 w-full bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 h-14 flex items-center justify-between px-2 z-30 transition-colors overflow-x-hidden">
      {navItems.map((item) => {
        const isGoLive = item.id === "go-live";
        const Icon = item.icon;
        const resolvedId =
          item.id === "go-live" ? "live-studio" : (item.id as PageId);
        const isActive =
          resolvedId === activePage ||
          (resolvedId === "home" && activePage === "home");

        return (
          <button
            key={item.id}
            onClick={() => onChangePage(resolvedId)}
            className={`flex flex-col items-center justify-center flex-1 text-xs transition-colors ${isGoLive
              ? "text-evz-orange"
              : isActive
                ? "text-slate-900 dark:text-slate-100"
                : "text-slate-400 dark:text-slate-500"
              }`}
          >
            <div
              className={`h-8 w-8 flex items-center justify-center rounded-full mb-0.5 transition-colors ${isGoLive
                ? "bg-evz-orange text-white shadow-lg"
                : isActive
                  ? "bg-slate-900 dark:bg-slate-600 text-white dark:text-slate-100"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
