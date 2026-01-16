'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DashboardNav } from '../components/DashboardNav';
import { FilterBar } from '../components/FilterBar';
import { GroupedPRDisplay } from '../components/GroupedPRDisplay';
import { LabelGroupSelector } from '../components/LabelGroupSelector';
import { PRTable } from '../components/PRTable';
import { useColumnConfig } from '../hooks/useColumnConfig';
import { usePullRequests } from '../hooks/usePullRequests';
import { useUrlFilters } from '../hooks/useUrlFilters';
import type { FilterOptions, Label } from '../types';

interface DashboardConfig {
  id: string;
  name: string;
  repos: string;
  filter: string;
}

export default function DashboardPage() {
  const params = useParams();
  const dashboardId = params.dashboard as string;

  const [dashboardConfig, setDashboardConfig] = useState<DashboardConfig | null>(null);
  const [allDashboards, setAllDashboards] = useState<DashboardConfig[]>([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const [hasServerToken, setHasServerToken] = useState<boolean | null>(null);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);
  const [groupByLabels, setGroupByLabels] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`pr-dashboard-group-labels-${dashboardId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  // Parse default filters from dashboard config
  const defaultFilters = useMemo((): Partial<FilterOptions> => {
    if (!dashboardConfig?.filter) {
      return { states: ['open'], labels: [], authors: [], branches: [], searchQuery: '' };
    }
    const params = new URLSearchParams(dashboardConfig.filter);
    const statesParam = params.get('states')?.split(',') || ['open'];
    return {
      states: statesParam as FilterOptions['states'],
      labels: params.get('labels')?.split(',').filter(Boolean) || [],
      authors: params.get('authors')?.split(',').filter(Boolean) || [],
      branches: params.get('branches')?.split(',').filter(Boolean) || [],
      searchQuery: params.get('search') || '',
    };
  }, [dashboardConfig]);

  const { filters, setFilters } = useUrlFilters(defaultFilters);

  // Load dashboard config
  useEffect(() => {
    const loadDashboards = async () => {
      try {
        const response = await fetch('/api/github/dashboards');
        const data = await response.json();
        setAllDashboards(data.dashboards || []);

        const config = data.dashboards?.find((d: DashboardConfig) => d.id === dashboardId);
        if (config) {
          setDashboardConfig(config);
        } else {
          setConfigError(`Dashboard "${dashboardId}" not found`);
        }
      } catch (error) {
        console.error('Failed to load dashboards:', error);
        setConfigError('Failed to load dashboard configuration');
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadDashboards();
  }, [dashboardId]);

  // Reset filters when dashboard changes
  useEffect(() => {
    if (!dashboardConfig?.filter) return;

    // Check if URL has explicit filter params
    const params = new URLSearchParams(window.location.search);
    const hasExplicitFilters =
      params.has('states') || params.has('labels') || params.has('authors') || params.has('branches') || params.has('search');

    // Only apply dashboard defaults if no explicit URL filters
    if (!hasExplicitFilters) {
      const dashboardParams = new URLSearchParams(dashboardConfig.filter);
      const statesParam = dashboardParams.get('states')?.split(',') || ['open'];
      setFilters({
        states: statesParam as FilterOptions['states'],
        labels: dashboardParams.get('labels')?.split(',').filter(Boolean) || [],
        authors: dashboardParams.get('authors')?.split(',').filter(Boolean) || [],
        branches: dashboardParams.get('branches')?.split(',').filter(Boolean) || [],
        searchQuery: dashboardParams.get('search') || '',
      });
    }
  }, [dashboardConfig, setFilters]);

  // Check server token
  useEffect(() => {
    const checkServerToken = async () => {
      try {
        const response = await fetch('/api/github/auth');
        const data = await response.json();
        setHasServerToken(data.hasToken);
        if (data.hasToken) {
          setGithubToken('server-configured');
        }
      } catch (error) {
        console.error('Failed to check server token:', error);
        setHasServerToken(false);
      }
    };

    checkServerToken();
  }, []);

  // Get repositories from dashboard config
  const selectedRepositories = useMemo(() => {
    if (!dashboardConfig?.repos) return [];
    return dashboardConfig.repos
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
  }, [dashboardConfig]);

  // Save group labels to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && dashboardId) {
      localStorage.setItem(
        `pr-dashboard-group-labels-${dashboardId}`,
        JSON.stringify(groupByLabels)
      );
    }
  }, [groupByLabels, dashboardId]);

  const {
    pullRequests,
    filteredPullRequests,
    isLoading: isLoadingPRs,
    error: prsError,
  } = usePullRequests({
    token: githubToken,
    repositories: selectedRepositories,
    filters,
    autoFetch: Boolean(githubToken && selectedRepositories.length > 0),
  });

  const { columns } = useColumnConfig();

  // Derive unique authors from all PRs
  const availableAuthors = useMemo(() => {
    const authorMap = new Map<string, { login: string; avatarUrl: string }>();
    for (const pr of pullRequests) {
      if (!authorMap.has(pr.author.login)) {
        authorMap.set(pr.author.login, {
          login: pr.author.login,
          avatarUrl: pr.author.avatarUrl,
        });
      }
    }
    return Array.from(authorMap.values()).sort((a, b) => a.login.localeCompare(b.login));
  }, [pullRequests]);

  // Derive unique target branches from all PRs
  const availableBranches = useMemo(() => {
    const branchSet = new Set<string>();
    for (const pr of pullRequests) {
      branchSet.add(pr.baseBranch);
    }
    return Array.from(branchSet).sort();
  }, [pullRequests]);

  // Fetch labels when repositories change
  useEffect(() => {
    if (githubToken && selectedRepositories.length > 0) {
      const fetchLabels = async () => {
        try {
          const reposParam = selectedRepositories.join(',');
          const headers: HeadersInit = {};
          if (githubToken !== 'server-configured') {
            headers['x-github-token'] = githubToken;
          }

          const response = await fetch(
            `/api/github/labels?repositories=${encodeURIComponent(reposParam)}`,
            { headers }
          );

          if (response.ok) {
            const data = await response.json();
            setAvailableLabels(data.data || []);
          }
        } catch (error) {
          console.error('Failed to fetch labels:', error);
        }
      };

      fetchLabels();
    }
  }, [githubToken, selectedRepositories]);

  if (isLoadingConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (configError || !dashboardConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard Not Found</h1>
          <p className="text-gray-600 mb-4">{configError}</p>
          <a href="/" className="text-blue-600 hover:text-blue-800">
            ← Back to home
          </a>
        </div>
      </div>
    );
  }

  if (!hasServerToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Token Required</h1>
          <p className="text-gray-600">Please configure GITHUB_TOKEN in your environment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">{dashboardConfig.name}</h1>
              <DashboardNav dashboards={allDashboards} currentDashboardId={dashboardId} />
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {selectedRepositories.length}{' '}
                {selectedRepositories.length === 1 ? 'repository' : 'repositories'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {prsError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{prsError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="border rounded-lg p-4 bg-white">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Repositories</h3>
              <div className="space-y-2">
                {selectedRepositories.map((repo) => (
                  <div key={repo} className="flex items-center p-2 bg-blue-50 rounded">
                    <svg
                      className="w-4 h-4 text-blue-600 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-900">{repo}</span>
                  </div>
                ))}
              </div>
            </div>

            <FilterBar
              filters={filters}
              availableLabels={availableLabels}
              availableAuthors={availableAuthors}
              availableBranches={availableBranches}
              onFiltersChange={setFilters}
            />

            <LabelGroupSelector
              availableLabels={availableLabels}
              selectedLabels={groupByLabels}
              onSelectionChange={setGroupByLabels}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Pull Requests
                  {!isLoadingPRs && ` (${filteredPullRequests.length})`}
                </h2>
              </div>

              {groupByLabels.length > 0 ? (
                <GroupedPRDisplay
                  pullRequests={filteredPullRequests}
                  groupByLabels={groupByLabels}
                  availableLabels={availableLabels}
                  columns={columns}
                  isLoading={isLoadingPRs}
                />
              ) : (
                <PRTable
                  pullRequests={filteredPullRequests}
                  columns={columns}
                  isLoading={isLoadingPRs}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
