import React, { useEffect, useState, useRef } from "react";
import { Eye, EyeOff, PinOff, Settings2 } from "lucide-react";
import { useMobile } from "../hooks/useMobile";
import { formatCurrencyValue } from "../utils/formatUtils";
import { useEarningsSummaryQuery } from "../hooks/api/useFinance";

type MoneyBarProps = {
  onViewEarnings: () => void;
};

type WidgetType = {
  id: string;
  label: string;
  value: number;
  currency?: string;
  accent?: boolean;
};

const FALLBACK_WIDGETS: WidgetType[] = [
  { id: "available", label: "Available now", value: 720, currency: "USD" },
  { id: "pending", label: "Pending", value: 1980, currency: "USD" },
  { id: "projected", label: "Projected this month", value: 3400, currency: "USD", accent: true },
];

export const MoneyBar: React.FC<MoneyBarProps> = ({ onViewEarnings }) => {
  const isMobile = useMobile();
  const { data: earningsSummary } = useEarningsSummaryQuery();
  // Load initial state from localStorage if available
  const [hiddenWidgetIds, setHiddenWidgetIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("moneybar_hidden_widgets");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const customizeMenuRef = useRef<HTMLDivElement>(null);
  const customizeBtnRef = useRef<HTMLButtonElement>(null);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem("moneybar_hidden_widgets", JSON.stringify(hiddenWidgetIds));
  }, [hiddenWidgetIds]);

  // Handle click outside to close customize menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isCustomizeOpen &&
        customizeMenuRef.current &&
        !customizeMenuRef.current.contains(event.target as Node) &&
        customizeBtnRef.current &&
        !customizeBtnRef.current.contains(event.target as Node)
      ) {
        setIsCustomizeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCustomizeOpen]);

  const toggleWidget = (id: string) => {
    setHiddenWidgetIds((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id]
    );
  };

  const widgets = earningsSummary?.summary
    ? [
        { id: "available", label: "Available now", value: Number(earningsSummary.summary.available || 0), currency: String(earningsSummary.summary.currency || "USD") },
        { id: "pending", label: "Pending", value: Number(earningsSummary.summary.pending || 0), currency: String(earningsSummary.summary.currency || "USD") },
        { id: "projected", label: "Projected this month", value: Number(earningsSummary.summary.projected || 0), currency: String(earningsSummary.summary.currency || "USD"), accent: true }
      ]
    : FALLBACK_WIDGETS;

  const visibleWidgets = widgets.filter((w) => !hiddenWidgetIds.includes(w.id));

  return (
    <div className="fixed top-14 left-0 right-0 w-full h-10 bg-slate-900 dark:bg-slate-950 text-sm text-slate-50 px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 flex items-center gap-2 z-[42] transition-colors shadow-sm">
      <div className="flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6 xl:gap-8 flex-1 min-w-0 overflow-x-auto scrollbar-hide pr-2">
        {visibleWidgets.map((widget) => (
          <MoneyItem
            key={widget.id}
            label={widget.label}
            value={formatCurrencyValue(widget.currency || "USD", widget.value, { isMobile })}
            accent={widget.accent}
            onUnpin={() => toggleWidget(widget.id)}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Customize Button */}
        <div className="relative">
          <button
            ref={customizeBtnRef}
            onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
            className={`p-1.5 rounded-full transition-colors ${isCustomizeOpen || hiddenWidgetIds.length > 0
              ? "bg-slate-800 text-slate-200"
              : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
              }`}
            title="Customize widgets"
          >
            <Settings2 size={16} />
          </button>

          {/* Customize Menu */}
          {isCustomizeOpen && (
            <div
              ref={customizeMenuRef}
              className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-50 overflow-hidden"
            >
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 px-2 uppercase tracking-wide">
                Visible Widgets
              </div>
              <div className="flex flex-col gap-1">
                {widgets.map((widget) => {
                  const isHidden = hiddenWidgetIds.includes(widget.id);
                  return (
                    <button
                      key={widget.id}
                      onClick={() => toggleWidget(widget.id)}
                      className="flex items-center justify-between px-2 py-1.5 text-sm rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      <span className={`dark:text-slate-200 ${isHidden ? "text-slate-400 decoration-slate-400" : ""}`}>
                        {widget.label} ({formatCurrencyValue(widget.currency || "USD", widget.value)})
                      </span>
                      {isHidden ? (
                        <EyeOff size={14} className="text-slate-400" />
                      ) : (
                        <Eye size={14} className="text-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onViewEarnings}
          className="inline-flex items-center gap-1 px-2 sm:px-2.5 md:px-3 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0 border border-transparent dark:border-slate-700"
        >
          <span>💰</span>
          <span className="hidden sm:inline">View earnings</span>
        </button>
      </div>
    </div>
  );
};

type MoneyItemProps = {
  label: string;
  value: string;
  accent?: boolean;
  onUnpin: () => void;
};

const MoneyItem: React.FC<MoneyItemProps> = ({ label, value, accent, onUnpin }) => {
  return (
    <div className="group flex flex-col min-w-0 relative pl-2 border-l border-slate-800/50 first:border-0 first:pl-0 hover:bg-slate-800/30 rounded px-1 transition-colors -ml-1 first:ml-0">
      <div className="flex items-center justify-between gap-4">
        <span className="text-tiny sm:text-xs text-slate-300 truncate">{label}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnpin();
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-slate-300 transition-all"
          title="Hide widget"
        >
          <PinOff size={10} />
        </button>
      </div>
      <span className={`text-xs sm:text-xs font-semibold ${accent ? "text-amber-300" : "text-white"} truncate`}>
        {value}
      </span>
    </div>
  );
};
