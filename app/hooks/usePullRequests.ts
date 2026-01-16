'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FilterOptions, PullRequest } from '../types';
import { rehydratePullRequest } from '../types';

interface UsePullRequestsOptions {
  token: string | null;
  repositories: string[];
  filters?: Partial<FilterOptions>;
  autoFetch?: boolean;
}

interface UsePullRequestsResult {
  pullRequests: PullRequest[];
  filteredPullRequests: PullRequest[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePullRequests({
  token,
  repositories,
  filters = {},
  autoFetch = true,
}: UsePullRequestsOptions): UsePullRequestsResult {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPullRequests = useCallback(async () => {
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

    try {
      const reposParam = repositories.join(',');
      const headers: HeadersInit = {};
      // Only send token header if it's a user-provided token (not 'server-configured')
      if (token !== 'server-configured') {
        headers['x-github-token'] = token;
      }

      const response = await fetch(
        `/api/github/pulls?repositories=${encodeURIComponent(reposParam)}&state=all&perPage=100`,
        {
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch pull requests');
      }

      const data = await response.json();
      setPullRequests((data.data || []).map(rehydratePullRequest));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [token, repositories]);

  useEffect(() => {
    if (autoFetch && token && repositories.length > 0) {
      fetchPullRequests();
    }
  }, [token, repositories, autoFetch, fetchPullRequests]);

  // Apply filters client-side
  const filteredPullRequests = pullRequests.filter((pr) => {
    // Filter by state
    if (filters.states && filters.states.length > 0) {
      if (!filters.states.includes(pr.state)) {
        return false;
      }
    }

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
      const hasMatchingReviewer = filters.reviewers.some((reviewer) =>
        pr.reviewers.includes(reviewer)
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
  });

  return {
    pullRequests,
    filteredPullRequests,
    isLoading,
    error,
    refetch: fetchPullRequests,
  };
}
