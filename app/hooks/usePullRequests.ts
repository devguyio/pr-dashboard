'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FilterOptions, PullRequest } from '../types';
import { rehydratePullRequest } from '../types';

type PRState = 'open' | 'closed' | 'merged';

interface UsePullRequestsOptions {
  token: string | null;
  repositories: string[];
  state: PRState;
  filters?: Partial<FilterOptions>;
  autoFetch?: boolean;
}

interface UsePullRequestsResult {
  pullRequests: PullRequest[];
  filteredPullRequests: PullRequest[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  refresh: () => Promise<void>; // Force refresh (bypass cache)
  lastUpdated: Date | null; // When data was last fetched/cached
  // Pagination fields
  page: number;
  fetchedCount: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export function usePullRequests({
  token,
  repositories,
  state,
  filters = {},
  autoFetch = true,
}: UsePullRequestsOptions): UsePullRequestsResult {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPullRequests = useCallback(
    async (forceRefresh = false) => {
      if (!token) {
        setError('GitHub token is required');
        return;
      }

      if (repositories.length === 0) {
        setPullRequests([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      setPullRequests([]);
      setPage(1);
      setHasMore(false);

      const reposParam = repositories.join(',');
      const headers: HeadersInit = {};
      if (token !== 'server-configured') {
        headers['x-github-token'] = token;
      }

      // For 'open' state, auto-fetch all pages (up to 10)
      // For 'closed' and 'merged', only fetch page 1
      const maxPages = state === 'open' ? 10 : 1;
      const allPRs: PullRequest[] = [];
      let currentPage = 1;
      let moreAvailable = true;

      try {
        while (moreAvailable && currentPage <= maxPages) {
          const refreshParam = forceRefresh && currentPage === 1 ? '&refresh=true' : '';
          const response = await fetch(
            `/api/github/pulls?repositories=${encodeURIComponent(reposParam)}&state=${state}&perPage=100&page=${currentPage}${refreshParam}`,
            { headers }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch pull requests');
          }

          const data = await response.json();
          const newPRs = (data.data || []).map(rehydratePullRequest);
          allPRs.push(...newPRs);
          moreAvailable = data.hasMore ?? false;

          // Track when data was cached
          if (data.cachedAt) {
            setLastUpdated(new Date(data.cachedAt));
          }

          // Update UI progressively after each page
          setPullRequests([...allPRs]);
          setPage(currentPage);
          setHasMore(moreAvailable);

          currentPage++;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    },
    [token, repositories, state]
  );

  const loadMore = useCallback(async () => {
    if (!token || !hasMore || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);

    try {
      const reposParam = repositories.join(',');
      const headers: HeadersInit = {};
      if (token !== 'server-configured') {
        headers['x-github-token'] = token;
      }

      const nextPage = page + 1;
      const response = await fetch(
        `/api/github/pulls?repositories=${encodeURIComponent(reposParam)}&state=${state}&perPage=100&page=${nextPage}`,
        { headers }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch more pull requests');
      }

      const data = await response.json();
      const newPRs = (data.data || []).map(rehydratePullRequest);
      setPullRequests((prev) => [...prev, ...newPRs]);
      setPage(nextPage);
      setHasMore(data.hasMore ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoadingMore(false);
    }
  }, [token, repositories, state, page, hasMore, isLoadingMore]);

  useEffect(() => {
    if (autoFetch && token && repositories.length > 0) {
      fetchPullRequests();
    }
  }, [token, repositories, autoFetch, fetchPullRequests]);

  // Apply filters client-side (state is already filtered server-side)
  const filteredPullRequests = pullRequests
    .filter((pr) => {
      // Filter by repository
      if (filters.repositories && filters.repositories.length > 0) {
        if (!filters.repositories.includes(pr.repository.fullName)) {
          return false;
        }
      }

      // Filter by labels (AND logic - PR must have ALL selected labels)
      if (filters.labels && filters.labels.length > 0) {
        const prLabelNames = pr.labels.map((l) => l.name);
        const hasAllLabels = filters.labels.every((filterLabel) =>
          prLabelNames.includes(filterLabel)
        );
        if (!hasAllLabels) {
          return false;
        }
      }

      // Filter by branches (target/base branch)
      if (filters.branches && filters.branches.length > 0) {
        if (!filters.branches.includes(pr.baseBranch)) {
          return false;
        }
      }

      // Filter by assignees
      if (filters.assignees && filters.assignees.length > 0) {
        const hasMatchingAssignee = filters.assignees.some((assignee) =>
          pr.assignees.includes(assignee)
        );
        if (!hasMatchingAssignee) {
          return false;
        }
      }

      // Filter by authors
      if (filters.authors && filters.authors.length > 0) {
        if (!filters.authors.includes(pr.author.login)) {
          return false;
        }
      }

      // Filter by reviewers
      if (filters.reviewers && filters.reviewers.length > 0) {
        const prReviewerLogins = pr.reviewers.map((r) => r.login);
        const hasMatchingReviewer = filters.reviewers.some((reviewer) =>
          prReviewerLogins.includes(reviewer)
        );
        if (!hasMatchingReviewer) {
          return false;
        }
      }

      // Filter by search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = pr.title.toLowerCase().includes(query);
        const matchesNumber = pr.number.toString().includes(query);
        const matchesAuthor = pr.author.login.toLowerCase().includes(query);

        if (!matchesTitle && !matchesNumber && !matchesAuthor) {
          return false;
        }
      }

      // Filter by date range
      if (filters.dateFrom && pr.createdAt < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && pr.createdAt > filters.dateTo) {
        return false;
      }

      return true;
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by created date descending (newest first)

  return {
    pullRequests,
    filteredPullRequests,
    isLoading,
    isLoadingMore,
    error,
    refetch: fetchPullRequests,
    refresh: () => fetchPullRequests(true),
    lastUpdated,
    // Pagination fields
    page,
    fetchedCount: pullRequests.length,
    hasMore,
    loadMore,
  };
}
