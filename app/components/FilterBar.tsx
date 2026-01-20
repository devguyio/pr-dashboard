'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { FilterOptions, Label } from '../types';

interface Author {
  login: string;
  avatarUrl: string;
}

interface Reviewer {
  login: string;
  avatarUrl: string;
}

interface FilterBarProps {
  filters: Partial<FilterOptions>;
  availableLabels: Label[];
  availableAuthors: Author[];
  availableBranches: string[];
  availableReviewers: Reviewer[];
  onFiltersChange: (filters: Partial<FilterOptions>) => void;
}

export function FilterBar({
  filters,
  availableLabels,
  availableAuthors,
  availableBranches,
  availableReviewers,
  onFiltersChange,
}: FilterBarProps) {
  const handleLabelChange = (labelName: string) => {
    const currentLabels = filters.labels || [];
    const newLabels = currentLabels.includes(labelName)
      ? currentLabels.filter((l) => l !== labelName)
      : [...currentLabels, labelName];
    onFiltersChange({ ...filters, labels: newLabels });
  };

  const handleAuthorChange = (authorLogin: string) => {
    const currentAuthors = filters.authors || [];
    const newAuthors = currentAuthors.includes(authorLogin)
      ? currentAuthors.filter((a) => a !== authorLogin)
      : [...currentAuthors, authorLogin];
    onFiltersChange({ ...filters, authors: newAuthors });
  };

  const handleBranchChange = (branch: string) => {
    const currentBranches = filters.branches || [];
    const newBranches = currentBranches.includes(branch)
      ? currentBranches.filter((b) => b !== branch)
      : [...currentBranches, branch];
    onFiltersChange({ ...filters, branches: newBranches });
  };

  const handleReviewerChange = (reviewer: string) => {
    const currentReviewers = filters.reviewers || [];
    const newReviewers = currentReviewers.includes(reviewer)
      ? currentReviewers.filter((r) => r !== reviewer)
      : [...currentReviewers, reviewer];
    onFiltersChange({ ...filters, reviewers: newReviewers });
  };

  const handleSearchChange = (query: string) => {
    onFiltersChange({ ...filters, searchQuery: query });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      labels: [],
      branches: [],
      authors: [],
      reviewers: [],
      searchQuery: '',
    });
  };

  const activeFilterCount =
    (filters.labels?.length || 0) +
    (filters.branches?.length || 0) +
    (filters.authors?.length || 0) +
    (filters.reviewers?.length || 0) +
    (filters.searchQuery ? 1 : 0);

  const [authorSearch, setAuthorSearch] = useState('');
  const [branchSearch, setBranchSearch] = useState('');
  const [reviewerSearch, setReviewerSearch] = useState('');
  const [labelSearch, setLabelSearch] = useState('');

  const filteredAuthors = availableAuthors.filter((author) =>
    author.login.toLowerCase().includes(authorSearch.toLowerCase())
  );

  const filteredBranches = availableBranches.filter((branch) =>
    branch.toLowerCase().includes(branchSearch.toLowerCase())
  );

  const filteredReviewers = availableReviewers.filter((reviewer) =>
    reviewer.login.toLowerCase().includes(reviewerSearch.toLowerCase())
  );

  const filteredLabels = availableLabels.filter((label) =>
    label.name.toLowerCase().includes(labelSearch.toLowerCase())
  );

  return (
    <div className="bg-white border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
          Search
        </label>
        <input
          id="search"
          type="text"
          value={filters.searchQuery || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search pull requests..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        />
      </div>

      {/* Authors Filter */}
      {availableAuthors.length > 0 && (
        <div>
          <div className="block text-sm font-medium text-gray-700 mb-2">Authors</div>
          <input
            type="text"
            placeholder="Search authors..."
            value={authorSearch}
            onChange={(e) => setAuthorSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {filteredAuthors.map((author) => (
              <button
                key={author.login}
                type="button"
                onClick={() => handleAuthorChange(author.login)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors flex items-center gap-1 ${
                  filters.authors?.includes(author.login)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                <Image
                  src={author.avatarUrl}
                  alt={author.login}
                  width={16}
                  height={16}
                  className="rounded-full"
                />
                {author.login}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Branches Filter */}
      {availableBranches.length > 0 && (
        <div>
          <div className="block text-sm font-medium text-gray-700 mb-2">Target Branch</div>
          <input
            type="text"
            placeholder="Search branches..."
            value={branchSearch}
            onChange={(e) => setBranchSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {filteredBranches.map((branch) => (
              <button
                key={branch}
                type="button"
                onClick={() => handleBranchChange(branch)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  filters.branches?.includes(branch)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {branch}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reviewers Filter */}
      {availableReviewers.length > 0 && (
        <div>
          <div className="block text-sm font-medium text-gray-700 mb-2">Reviewers</div>
          <input
            type="text"
            placeholder="Search reviewers..."
            value={reviewerSearch}
            onChange={(e) => setReviewerSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {filteredReviewers.map((reviewer) => (
              <button
                key={reviewer.login}
                type="button"
                onClick={() => handleReviewerChange(reviewer.login)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors flex items-center gap-1 ${
                  filters.reviewers?.includes(reviewer.login)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                <Image
                  src={reviewer.avatarUrl}
                  alt={reviewer.login}
                  width={16}
                  height={16}
                  className="rounded-full"
                />
                {reviewer.login}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Labels Filter */}
      {availableLabels.length > 0 && (
        <div>
          <div className="block text-sm font-medium text-gray-700 mb-2">Labels</div>
          <input
            type="text"
            placeholder="Search labels..."
            value={labelSearch}
            onChange={(e) => setLabelSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-sm text-gray-900 border border-gray-300 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {filteredLabels.map((label) => (
              <button
                key={label.id}
                type="button"
                onClick={() => handleLabelChange(label.name)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  filters.labels?.includes(label.name) ? 'border-2' : 'border'
                }`}
                style={{
                  backgroundColor: filters.labels?.includes(label.name)
                    ? `#${label.color}`
                    : `#${label.color}20`,
                  color: filters.labels?.includes(label.name) ? '#ffffff' : `#${label.color}`,
                  borderColor: `#${label.color}`,
                }}
              >
                {label.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
