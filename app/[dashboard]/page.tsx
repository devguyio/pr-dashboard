'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AuthorGroupSelector } from '../components/AuthorGroupSelector';
import { DashboardNav } from '../components/DashboardNav';
import { FilterBar } from '../components/FilterBar';
import { GroupedPRDisplay } from '../components/GroupedPRDisplay';
import { LabelGroupSelector } from '../components/LabelGroupSelector';
import { PRTable } from '../components/PRTable';
import { RefreshIndicator } from '../components/RefreshIndicator';
import { StateSelector } from '../components/StateSelector';
import { useColumnConfig } from '../hooks/useColumnConfig';
import { usePullRequests } from '../hooks/usePullRequests';
import { useUrlFilters } from '../hooks/useUrlFilters';
import { stringToColor } from '../lib/colors';
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

  const [groupByAuthors, setGroupByAuthors] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`pr-dashboard-group-authors-${dashboardId}`);
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

  // Parse default state from dashboard config
  const defaultState = useMemo((): 'open' | 'closed' | 'merged' => {
    if (!dashboardConfig?.filter) {
      return 'open';
    }
    const params = new URLSearchParams(dashboardConfig.filter);
    const stateParam = params.get('state') || params.get('states')?.split(',')[0] || 'open';
    return stateParam as 'open' | 'closed' | 'merged';
  }, [dashboardConfig]);

  const [prState, setPrState] = useState<'open' | 'closed' | 'merged'>('open');

  // Update prState when defaultState changes
  useEffect(() => {
    setPrState(defaultState);
  }, [defaultState]);

  // Parse default filters from dashboard config (without states)
  const defaultFilters = useMemo((): Partial<FilterOptions> => {
    if (!dashboardConfig?.filter) {
      return { labels: [], authors: [], branches: [], searchQuery: '' };
    }
    const params = new URLSearchParams(dashboardConfig.filter);
    return {
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
      params.has('labels') ||
      params.has('authors') ||
      params.has('branches') ||
      params.has('search');

    // Only apply dashboard defaults if no explicit URL filters
    if (!hasExplicitFilters) {
      const dashboardParams = new URLSearchParams(dashboardConfig.filter);
      setFilters({
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

  // Get all repositories from dashboard config
  const allRepos = useMemo(() => {
    if (!dashboardConfig?.repos) return [];
    return dashboardConfig.repos
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
  }, [dashboardConfig]);

  // Use filters.repositories if set, otherwise use all repos
  const selectedRepositories = useMemo(() => {
    if (filters.repositories && filters.repositories.length > 0) {
      // Only use repos that are in allRepos (validate against config)
      return filters.repositories.filter((r) => allRepos.includes(r));
    }
    return allRepos;
  }, [filters.repositories, allRepos]);

  // Toggle handler updates URL filters
  const handleToggleRepo = (repo: string) => {
    const newRepos = selectedRepositories.includes(repo)
      ? selectedRepositories.filter((r) => r !== repo)
      : [...selectedRepositories, repo];
    // Only set repos filter if not all repos are selected
    const reposFilter = newRepos.length === allRepos.length ? [] : newRepos;
    setFilters({ ...filters, repositories: reposFilter });
  };

  // Save group labels to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && dashboardId) {
      localStorage.setItem(
        `pr-dashboard-group-labels-${dashboardId}`,
        JSON.stringify(groupByLabels)
      );
    }
  }, [groupByLabels, dashboardId]);

  // Save group authors to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && dashboardId) {
      localStorage.setItem(
        `pr-dashboard-group-authors-${dashboardId}`,
        JSON.stringify(groupByAuthors)
      );
    }
  }, [groupByAuthors, dashboardId]);

  const {
    pullRequests,
    filteredPullRequests,
    isLoading: isLoadingPRs,
    isLoadingMore,
    error: prsError,
    fetchedCount,
    hasMore,
    loadMore,
    lastUpdated,
    refresh,
  } = usePullRequests({
    token: githubToken,
    repositories: allRepos, // Always fetch all repos, filter client-side
    state: prState,
    filters: { ...filters, repositories: selectedRepositories }, // Pass selected repos for client-side filtering
    autoFetch: Boolean(githubToken && allRepos.length > 0),
  });

  const { columns } = useColumnConfig();

  // Auto-refresh on tab focus if data is stale (> 5 min)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && lastUpdated) {
        const ageMin = (Date.now() - lastUpdated.getTime()) / 60000;
        if (ageMin > 5) {
          refresh();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lastUpdated, refresh]);

  // PRs filtered by selected repos only (for deriving filter options)
  const repoFilteredPRs = useMemo(() => {
    return pullRequests.filter((pr) => selectedRepositories.includes(pr.repository.fullName));
  }, [pullRequests, selectedRepositories]);

  // Derive unique authors from selected repos' PRs
  const availableAuthors = useMemo(() => {
    const authorMap = new Map<string, { login: string; avatarUrl: string }>();
    for (const pr of repoFilteredPRs) {
      if (!authorMap.has(pr.author.login)) {
        authorMap.set(pr.author.login, {
          login: pr.author.login,
          avatarUrl: pr.author.avatarUrl,
        });
      }
    }
    return Array.from(authorMap.values()).sort((a, b) => a.login.localeCompare(b.login));
  }, [repoFilteredPRs]);

  // Derive unique target branches from selected repos' PRs
  const availableBranches = useMemo(() => {
    const branchSet = new Set<string>();
    for (const pr of repoFilteredPRs) {
      branchSet.add(pr.baseBranch);
    }
    return Array.from(branchSet).sort();
  }, [repoFilteredPRs]);

  // Derive unique reviewers from selected repos' PRs
  const availableReviewers = useMemo(() => {
    const reviewerMap = new Map<string, { login: string; avatarUrl: string }>();
    for (const pr of repoFilteredPRs) {
      for (const reviewer of pr.reviewers) {
        if (!reviewerMap.has(reviewer.login)) {
          reviewerMap.set(reviewer.login, {
            login: reviewer.login,
            avatarUrl: reviewer.avatarUrl,
          });
        }
      }
    }
    return Array.from(reviewerMap.values()).sort((a, b) => a.login.localeCompare(b.login));
  }, [repoFilteredPRs]);

  // Fetch labels for all dashboard repos (not just selected)
  useEffect(() => {
    if (githubToken && allRepos.length > 0) {
      const fetchLabels = async () => {
        try {
          const reposParam = allRepos.join(',');
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
  }, [githubToken, allRepos]);

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
              <Link
                href="/"
                className="text-2xl font-bold text-gray-900 hover:text-gray-700 shrink-0"
              >
                PR Dashboard
              </Link>
              <DashboardNav dashboards={allDashboards} currentDashboardId={dashboardId} />
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
              <div className="flex flex-wrap gap-2">
                {allRepos.map((repo) => {
                  const isSelected = selectedRepositories.includes(repo);
                  return (
                    <button
                      type="button"
                      key={repo}
                      onClick={() => handleToggleRepo(repo)}
                      className={`px-4 py-1.5 text-base font-medium rounded-full border transition-colors ${
                        isSelected ? 'border-2' : 'border'
                      }`}
                      style={{
                        backgroundColor: isSelected
                          ? `#${stringToColor(repo)}`
                          : `#${stringToColor(repo)}20`,
                        color: isSelected ? '#ffffff' : `#${stringToColor(repo)}`,
                        borderColor: `#${stringToColor(repo)}`,
                      }}
                    >
                      {repo}
                    </button>
                  );
                })}
              </div>
            </div>

            <FilterBar
              filters={filters}
              availableLabels={availableLabels}
              availableAuthors={availableAuthors}
              availableBranches={availableBranches}
              availableReviewers={availableReviewers}
              onFiltersChange={setFilters}
            />

            <LabelGroupSelector
              availableLabels={availableLabels}
              selectedLabels={groupByLabels}
              onSelectionChange={setGroupByLabels}
            />

            <AuthorGroupSelector
              availableAuthors={availableAuthors}
              selectedAuthors={groupByAuthors}
              onSelectionChange={setGroupByAuthors}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <StateSelector
                  value={prState}
                  onChange={setPrState}
                  counts={{ [prState]: fetchedCount }}
                  isLoading={isLoadingPRs}
                />
              </div>
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                  {filteredPullRequests.length !== fetchedCount ? (
                    <>
                      {filteredPullRequests.length} of {fetchedCount} {prState}
                    </>
                  ) : isLoadingPRs ? (
                    'Loading...'
                  ) : (
                    `${fetchedCount} ${prState}`
                  )}
                  <RefreshIndicator
                    lastUpdated={lastUpdated}
                    isLoading={isLoadingPRs}
                    onRefresh={refresh}
                  />
                  {hasMore && (
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={isLoadingMore}
                      className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      {isLoadingMore ? 'Loading...' : '+ Load more'}
                    </button>
                  )}
                </h2>
              </div>

              {groupByLabels.length > 0 || groupByAuthors.length > 0 ? (
                <GroupedPRDisplay
                  pullRequests={filteredPullRequests}
                  groupByLabels={groupByLabels}
                  groupByAuthors={groupByAuthors}
                  availableLabels={availableLabels}
                  availableAuthors={availableAuthors}
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
