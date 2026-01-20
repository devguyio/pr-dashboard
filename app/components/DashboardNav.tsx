'use client';

import Link from 'next/link';

interface DashboardConfig {
  id: string;
  name: string;
  repos: string;
  filter: string;
}

interface DashboardNavProps {
  dashboards: DashboardConfig[];
  currentDashboardId: string;
}

export function DashboardNav({ dashboards, currentDashboardId }: DashboardNavProps) {
  if (dashboards.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center gap-2">
      <span className="text-gray-400">|</span>
      <div className="flex items-center gap-1 flex-wrap">
        {dashboards.map((dashboard) => {
          const isSelected = dashboard.id === currentDashboardId;
          // Toggle: clicking selected dashboard goes to /all (deselects)
          const href = isSelected ? '/all' : `/${dashboard.id}`;

          return (
            <Link
              key={dashboard.id}
              href={href}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {dashboard.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
