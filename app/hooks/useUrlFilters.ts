'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FilterOptions } from '../types';

interface UseUrlFiltersResult {
  filters: Partial<FilterOptions>;
  setFilters: (filters: Partial<FilterOptions>) => void;
  isLoading: boolean;
}

function parseStringArray(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

function filtersToSearchParams(filters: Partial<FilterOptions>): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.labels && filters.labels.length > 0) {
    params.set('labels', filters.labels.join(','));
  }
  if (filters.branches && filters.branches.length > 0) {
    params.set('branches', filters.branches.join(','));
  }
  if (filters.authors && filters.authors.length > 0) {
    params.set('authors', filters.authors.join(','));
  }
  if (filters.reviewers && filters.reviewers.length > 0) {
    params.set('reviewers', filters.reviewers.join(','));
  }
  if (filters.searchQuery) {
    params.set('search', filters.searchQuery);
  }
  if (filters.repositories && filters.repositories.length > 0) {
    params.set('repos', filters.repositories.join(','));
  }

  return params;
}

function searchParamsToFilters(params: URLSearchParams): Partial<FilterOptions> {
  const filters: Partial<FilterOptions> = {};

  const labels = parseStringArray(params.get('labels'));
  if (labels) filters.labels = labels;

  const branches = parseStringArray(params.get('branches'));
  if (branches) filters.branches = branches;

  const authors = parseStringArray(params.get('authors'));
  if (authors) filters.authors = authors;

  const reviewers = parseStringArray(params.get('reviewers'));
  if (reviewers) filters.reviewers = reviewers;

  const search = params.get('search');
  if (search) filters.searchQuery = search;

  const repos = parseStringArray(params.get('repos'));
  if (repos) filters.repositories = repos;

  return filters;
}

function hasUrlParams(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return (
    params.has('labels') ||
    params.has('branches') ||
    params.has('authors') ||
    params.has('reviewers') ||
    params.has('search') ||
    params.has('repos')
  );
}

export function useUrlFilters(defaults: Partial<FilterOptions> = {}): UseUrlFiltersResult {
  const [filters, setFiltersState] = useState<Partial<FilterOptions>>(() => {
    if (typeof window === 'undefined') return defaults;

    const params = new URLSearchParams(window.location.search);
    if (hasUrlParams()) {
      const urlFilters = searchParamsToFilters(params);
      return {
        labels: urlFilters.labels || defaults.labels || [],
        branches: urlFilters.branches || defaults.branches || [],
        authors: urlFilters.authors || defaults.authors || [],
        reviewers: urlFilters.reviewers || defaults.reviewers || [],
        searchQuery: urlFilters.searchQuery || defaults.searchQuery || '',
        repositories: urlFilters.repositories || defaults.repositories || [],
      };
    }

    return defaults;
  });

  const [isLoading, setIsLoading] = useState(!hasUrlParams());
  const [defaultsLoaded, setDefaultsLoaded] = useState(hasUrlParams());

  // Load server defaults if no URL params present
  useEffect(() => {
    if (defaultsLoaded) return;

    const loadDefaults = async () => {
      try {
        const response = await fetch('/api/github/defaults');
        const data = await response.json();

        if (data.filters) {
          const serverFilters = searchParamsToFilters(new URLSearchParams(data.filters));
          const merged: Partial<FilterOptions> = {
            labels: serverFilters.labels || defaults.labels || [],
            branches: serverFilters.branches || defaults.branches || [],
            authors: serverFilters.authors || defaults.authors || [],
            reviewers: serverFilters.reviewers || defaults.reviewers || [],
            searchQuery: serverFilters.searchQuery || defaults.searchQuery || '',
            repositories: serverFilters.repositories || defaults.repositories || [],
          };
          setFiltersState(merged);

          // Update URL to reflect defaults
          const params = filtersToSearchParams(merged);
          const newUrl = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }
      } catch (error) {
        console.error('Failed to load default filters:', error);
      } finally {
        setIsLoading(false);
        setDefaultsLoaded(true);
      }
    };

    loadDefaults();
  }, [defaultsLoaded, defaults]);

  const setFilters = useCallback((newFilters: Partial<FilterOptions>) => {
    setFiltersState(newFilters);

    if (typeof window === 'undefined') return;

    const params = filtersToSearchParams(newFilters);
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, []);

  return { filters, setFilters, isLoading };
}
