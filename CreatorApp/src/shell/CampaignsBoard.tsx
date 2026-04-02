
import React from "react";

type CampaignsBoardProps = {
  filter: string | null;
};

export const CampaignsBoard: React.FC<CampaignsBoardProps> = ({ filter }) => {
  const columns = ["Leads", "Pitches", "Negotiating", "Active"];
  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 text-sm overflow-y-auto bg-evz-light dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      <h2 className="text-sm font-semibold mb-2 dark:text-slate-100">Campaigns Board</h2>
      {filter && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          Filter applied from pipeline: <span className="font-semibold dark:text-slate-200">{filter}</span>
        </p>
      )}
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
        This is a placeholder for the full Campaigns Board view. It will show stages such as leads,
        pitches, negotiations and active contracts with drag-and-drop support.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-2">
        {columns.map((col) => (
          <div
            key={col}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-3 min-h-[140px] transition-colors"
          >
            <div className="text-sm font-semibold mb-1 dark:text-slate-100">{col}</div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Cards representing campaigns in the {col.toLowerCase()} stage will appear here.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
