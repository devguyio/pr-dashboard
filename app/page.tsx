'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FilterBar } from './components/FilterBar';
import { GroupedPRDisplay } from './components/GroupedPRDisplay';
import { LabelGroupSelector } from './components/LabelGroupSelector';
import { PRTable } from './components/PRTable';
import { RepositorySelector } from './components/RepositorySelector';
import { useColumnConfig } from './hooks/useColumnConfig';
import { usePullRequests } from './hooks/usePullRequests';
import { useRepositories } from './hooks/useRepositories';
import { useUrlFilters } from './hooks/useUrlFilters';
import type { Label } from './types';

interface DashboardConfig {
  id: string;
  name: string;
  repos: string;
  filter: string;
}

export default function Home() {
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
  const { filters, setFilters } = useUrlFilters({
    states: ['open'],
    labels: [],
    searchQuery: '',
  });
  const [availableLabels, setAvailableLabels] = useState<Label[]>([]);

  // Check if server has a token configured
  useEffect(() => {
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
  }, []);

  // Load dashboards from server
  useEffect(() => {
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
  }, []);

  // Load default repositories from server
  useEffect(() => {
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
  }, []);

  // Save group labels to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pr-dashboard-group-labels', JSON.stringify(groupByLabels));
    }
  }, [groupByLabels]);

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

  const handleSaveToken = () => {
    if (tokenInput.trim()) {
      localStorage.setItem('github-token', tokenInput.trim());
      setGithubToken(tokenInput.trim());
      setShowTokenInput(false);
    }
  };

  const handleClearToken = () => {
    localStorage.removeItem('github-token');
    setGithubToken(null);
    setTokenInput('');
    setShowTokenInput(true);
  };

  // If dashboards are configured, show dashboard selector
  if (!isLoadingDashboards && dashboards.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-gray-900">PR Dashboard</h1>
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

  if (showTokenInput) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">PR Dashboard</h1>
          <p className="text-gray-600 mb-6">
            Enter your GitHub personal access token to get started. The token will be stored
            securely in your browser&apos;s local storage.
          </p>
          <div className="space-y-4">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Token
              </label>
              <input
                id="token"
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveToken()}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveToken}
              disabled={!tokenInput.trim()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Save Token
            </button>
            <p className="text-xs text-gray-500">
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">PR Dashboard</h1>
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
              {!hasServerToken && (
                <button
                  type="button"
                  onClick={handleClearToken}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Change Token
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
                  onFiltersChange={setFilters}
                />

                <LabelGroupSelector
                  availableLabels={availableLabels}
                  selectedLabels={groupByLabels}
                  onSelectionChange={setGroupByLabels}
                />
              </>
            )}
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

              {selectedRepositories.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {hasDefaultRepos
                    ? 'Loading pull requests...'
                    : 'Select repositories from the sidebar to view pull requests'}
                </div>
              ) : groupByLabels.length > 0 ? (
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
