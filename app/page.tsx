'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AuthorGroupSelector } from './components/AuthorGroupSelector';
import { FilterBar } from './components/FilterBar';
import { GroupedPRDisplay } from './components/GroupedPRDisplay';
import { LabelGroupSelector } from './components/LabelGroupSelector';
import { PRTable } from './components/PRTable';
import { RefreshIndicator } from './components/RefreshIndicator';
import { RepositorySelector } from './components/RepositorySelector';
import {
  loadConfig,
  saveConfig,
  useElectronConfig,
  useIsElectron,
} from './components/SettingsModal';
import { StateSelector } from './components/StateSelector';
import { useColumnConfig } from './hooks/useColumnConfig';
import { usePullRequests } from './hooks/usePullRequests';
import { useRepositories } from './hooks/useRepositories';
import { useUrlFilters } from './hooks/useUrlFilters';
import { stringToColor } from './lib/colors';
import type { Label } from './types';

interface DashboardConfig {
  id: string;
  name: string;
  repos: string;
  filter: string;
}

export default function Home() {
  const isElectron = useIsElectron();
  const electronConfig = useElectronConfig();
  const [showSettings, setShowSettings] = useState(false);
  const [dashboards, setDashboards] = useState<DashboardConfig[]>([]);
  const [isLoadingDashboards, setIsLoadingDashboards] = useState(true);
  const [hasServerToken, setHasServerToken] = useState<boolean | null>(null);
  const [hasDefaultRepos, setHasDefaultRepos] = useState(false);
  const [githubToken, setGithubToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('github-token');
    }
    return null;
  });
  const [showTokenInput, setShowTokenInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('github-token');
    }
    return true;
  });
  const [tokenInput, setTokenInput] = useState('');
  const [reposInput, setReposInput] = useState('');
  const [dashboardsInput, setDashboardsInput] = useState('');
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [selectedRepositories, setSelectedRepositories] = useState<string[]>([]);
  const [groupByLabels, setGroupByLabels] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pr-dashboard-group-labels');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error('Failed to parse saved group labels:', error);
        }
      }
    }
    return [];
  });
  const [groupByAuthors, setGroupByAuthors] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pr-dashboard-group-authors');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.error('Failed to parse saved group authors:', error);
        }
      }
    }
    return [];
  });
  const [prState, setPrState] = useState<'open' | 'closed' | 'merged'>('open');
  const { filters, setFilters } = useUrlFilters({
    labels: [],
    searchQuery: '',
  });
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);

  // Check if server has a token configured (or use Electron config)
  useEffect(() => {
    // Wait for Electron detection to complete
    if (isElectron === null) return;

    // In Electron, use config from localStorage
    if (isElectron && electronConfig) {
      if (electronConfig.githubToken) {
        setGithubToken(electronConfig.githubToken);
        setShowTokenInput(false);
        setHasServerToken(false);
      }
      return;
    }

    // In Electron without config yet, wait for it
    if (isElectron && !electronConfig) return;

    const checkServerToken = async () => {
      try {
        const response = await fetch('/api/github/auth');
        const data = await response.json();
        setHasServerToken(data.hasToken);

        // If server has a token, we don't need to show the input
        if (data.hasToken) {
          setShowTokenInput(false);
          // Set a dummy token to enable the hooks
          setGithubToken('server-configured');
        }
      } catch (error) {
        console.error('Failed to check server token:', error);
        setHasServerToken(false);
      }
    };

    checkServerToken();
  }, [isElectron, electronConfig]);

  // Load dashboards from server (or use Electron config)
  useEffect(() => {
    // Wait for Electron detection to complete
    if (isElectron === null) return;

    // In Electron, use config from localStorage
    if (isElectron && electronConfig) {
      setDashboards(electronConfig.dashboards);
      setIsLoadingDashboards(false);
      return;
    }

    // In Electron without config yet, wait for it
    if (isElectron && !electronConfig) return;

    const loadDashboards = async () => {
      try {
        const response = await fetch('/api/github/dashboards');
        const data = await response.json();
        setDashboards(data.dashboards || []);
      } catch (error) {
        console.error('Failed to load dashboards:', error);
      } finally {
        setIsLoadingDashboards(false);
      }
    };

    loadDashboards();
  }, [isElectron, electronConfig]);

  // Load default repositories from server (or use Electron config)
  useEffect(() => {
    // Wait for Electron detection to complete
    if (isElectron === null) return;

    // In Electron, use config from localStorage
    if (isElectron && electronConfig) {
      if (electronConfig.defaultRepos.length > 0) {
        setSelectedRepositories(electronConfig.defaultRepos);
        setHasDefaultRepos(true);
      }
      return;
    }

    // In Electron without config yet, wait for it
    if (isElectron && !electronConfig) return;

    const loadDefaultRepos = async () => {
      try {
        const response = await fetch('/api/github/defaults');
        const data = await response.json();

        if (data.repositories && data.repositories.length > 0) {
          setSelectedRepositories(data.repositories);
          setHasDefaultRepos(true);
        }
      } catch (error) {
        console.error('Failed to load default repositories:', error);
      }
    };

    loadDefaultRepos();
  }, [isElectron, electronConfig]);

  // Save group labels to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pr-dashboard-group-labels', JSON.stringify(groupByLabels));
    }
  }, [groupByLabels]);

  // Save group authors to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pr-dashboard-group-authors', JSON.stringify(groupByAuthors));
    }
  }, [groupByAuthors]);

  // Hooks
  const {
    repositories,
    isLoading: isLoadingRepos,
    error: reposError,
  } = useRepositories({
    token: githubToken,
    autoFetch: !!githubToken,
  });

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
    repositories: selectedRepositories,
    state: prState,
    filters,
    autoFetch: Boolean(githubToken && selectedRepositories.length > 0),
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

  // Derive unique reviewers from all PRs
  const availableReviewers = useMemo(() => {
    const reviewerMap = new Map<string, { login: string; avatarUrl: string }>();
    for (const pr of pullRequests) {
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
  }, [pullRequests]);

  // Fetch labels when repositories change
  useEffect(() => {
    if (githubToken && selectedRepositories.length > 0) {
      const fetchLabels = async () => {
        try {
          const reposParam = selectedRepositories.join(',');
          const headers: HeadersInit = {};
          // Only send token header if it's a user-provided token (not 'server-configured')
          if (githubToken !== 'server-configured') {
            headers['x-github-token'] = githubToken;
          }

          const response = await fetch(
            `/api/github/labels?repositories=${encodeURIComponent(reposParam)}`,
            {
              headers,
            }
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

  // Load settings form with current config when opening
  useEffect(() => {
    if (showSettings || showTokenInput) {
      const config = loadConfig();
      setTokenInput(config.githubToken || '');
      setReposInput((config.defaultRepos || []).join(', '));
      setDashboardsInput(
        config.dashboards && config.dashboards.length > 0
          ? JSON.stringify(config.dashboards, null, 2)
          : '[]'
      );
      setSettingsError(null);
    }
  }, [showSettings, showTokenInput]);

  const handleSaveSettings = () => {
    // Validate dashboards JSON
    let parsedDashboards = [];
    if (dashboardsInput.trim()) {
      try {
        parsedDashboards = JSON.parse(dashboardsInput);
        if (!Array.isArray(parsedDashboards)) {
          setSettingsError('Dashboards must be a JSON array');
          return;
        }
      } catch (e) {
        setSettingsError(`Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`);
        return;
      }
    }

    // Parse repos
    const repos = reposInput
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    // Save config
    saveConfig({
      githubToken: tokenInput.trim() || undefined,
      defaultRepos: repos,
      dashboards: parsedDashboards,
    });

    // Reload to apply
    window.location.reload();
  };

  // Show loading while detecting environment
  if (isElectron === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // If dashboards are configured, show dashboard selector
  if (!isLoadingDashboards && dashboards.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700">
              PR Dashboard
            </Link>
            {isElectron && (
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Settings
              </button>
            )}
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Select a Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboards.map((dashboard) => (
                <Link
                  key={dashboard.id}
                  href={`/${dashboard.id}`}
                  className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{dashboard.name}</h3>
                  <p className="text-sm text-gray-500">
                    {dashboard.repos.split(',').length}{' '}
                    {dashboard.repos.split(',').length === 1 ? 'repository' : 'repositories'}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show settings form for Electron, or config message for web
  if (showTokenInput || showSettings) {
    // Web without server token - show configuration needed message
    if (!isElectron && !showSettings) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">PR Dashboard</h1>
            <p className="text-gray-600 mb-4">Server configuration required.</p>
            <p className="text-sm text-gray-500">
              Please set the <code className="bg-gray-100 px-1 py-0.5 rounded">GITHUB_TOKEN</code>{' '}
              environment variable to enable the dashboard.
            </p>
          </div>
        </div>
      );
    }

    // Electron - show full settings form
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-xl w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">PR Dashboard Settings</h1>

          <div className="space-y-6">
            {/* GitHub Token */}
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Token
              </label>
              <input
                id="token"
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Need a token?{' '}
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                >
                  Create one here
                </a>
              </p>
            </div>

            {/* Default Repositories */}
            <div>
              <label htmlFor="repos" className="block text-sm font-medium text-gray-700 mb-2">
                Default Repositories
              </label>
              <input
                id="repos"
                type="text"
                value={reposInput}
                onChange={(e) => setReposInput(e.target.value)}
                placeholder="owner/repo, owner/repo2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">Comma-separated list of repositories</p>
            </div>

            {/* Dashboards JSON */}
            <div>
              <label htmlFor="dashboards" className="block text-sm font-medium text-gray-700 mb-2">
                Dashboards (JSON)
              </label>
              <textarea
                id="dashboards"
                value={dashboardsInput}
                onChange={(e) => {
                  setDashboardsInput(e.target.value);
                  setSettingsError(null);
                }}
                placeholder='[{"id": "my-dashboard", "name": "My Dashboard", "repos": "owner/repo", "filter": ""}]'
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                spellCheck={false}
              />
              <p className="mt-1 text-xs text-gray-500">
                JSON array of dashboard configurations (optional)
              </p>
            </div>

            {settingsError && <p className="text-sm text-red-600">{settingsError}</p>}

            <div className="flex gap-3">
              {showSettings && (
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={!tokenInput.trim()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700">
              PR Dashboard
            </Link>
            <div className="flex items-center gap-4">
              {hasServerToken && (
                <span className="text-sm text-gray-500">Using server-configured token</span>
              )}
              {hasDefaultRepos && selectedRepositories.length > 0 && (
                <span className="text-sm text-gray-500">
                  Monitoring {selectedRepositories.length}{' '}
                  {selectedRepositories.length === 1 ? 'repository' : 'repositories'}
                </span>
              )}
              {isElectron && (
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Settings
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Messages */}
        {(reposError || prsError) && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{reposError || prsError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {hasDefaultRepos ? (
              <div className="border rounded-lg p-4 bg-white">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">
                  Configured Repositories
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedRepositories.map((repo) => (
                    <span
                      key={repo}
                      className="px-4 py-1.5 text-base font-medium rounded-full border-2"
                      style={{
                        backgroundColor: `#${stringToColor(repo)}`,
                        color: '#ffffff',
                        borderColor: `#${stringToColor(repo)}`,
                      }}
                    >
                      {repo}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs text-gray-500">
                  Repositories configured via environment variables
                </p>
              </div>
            ) : (
              <RepositorySelector
                repositories={repositories}
                selectedRepositories={selectedRepositories}
                onSelectionChange={setSelectedRepositories}
                isLoading={isLoadingRepos}
              />
            )}

            {selectedRepositories.length > 0 && (
              <>
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
              </>
            )}
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

              {selectedRepositories.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {hasDefaultRepos
                    ? 'Loading pull requests...'
                    : 'Select repositories from the sidebar to view pull requests'}
                </div>
              ) : groupByLabels.length > 0 || groupByAuthors.length > 0 ? (
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
