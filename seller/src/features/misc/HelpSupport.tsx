import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import SupportCenterPage from './SupportCenter';
import SupportSystemPage from './SupportSystem';
import SupportChangelogPage from './SupportChangelog';

export default function HelpSupport() {
  const location = useLocation();
  const path = location.pathname;

  const current = useMemo(() => {
    if (path.startsWith('/support/status')) return 'system-status';
    if (path.startsWith('/support/changelog')) return 'changelog';
    return 'support-center';
  }, [path]);

  const content = useMemo(() => {
    if (current === 'system-status') return <SupportSystemPage />;
    if (current === 'changelog') return <SupportChangelogPage />;
    return <SupportCenterPage />;
  }, [current]);

  return (
    <div className="w-full">
      {content}
    </div>
  );
}
