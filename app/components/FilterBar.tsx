'use client';

import type { FilterOptions, Label } from '../types';

interface Author {
  login: string;
  avatarUrl: string;
}

interface FilterBarProps {
  filters: Partial<FilterOptions>;
  availableLabels: Label[];
  availableAuthors: Author[];
  availableBranches: string[];
  onFiltersChange: (filters: Partial<FilterOptions>) => void;
}

export function FilterBar({
  filters,
  availableLabels,
  availableAuthors,
  availableBranches,
  onFiltersChange,
}: FilterBarProps) {
  const handleStateChange = (state: FilterOptions['states'][number]) => {
    const currentStates = filters.states || [];
    const newStates = currentStates.includes(state)
      ? currentStates.filter((s) => s !== state)
      : [...currentStates, state];
    onFiltersChange({ ...filters, states: newStates });
  };

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

  const handleSearchChange = (query: string) => {
    onFiltersChange({ ...filters, searchQuery: query });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      states: ['open'],
      labels: [],
      branches: [],
      authors: [],
      searchQuery: '',
    });
  };

  const activeFilterCount =
    (filters.states?.length || 0) +
    (filters.labels?.length || 0) +
    (filters.branches?.length || 0) +
    (filters.authors?.length || 0) +
    (filters.searchQuery ? 1 : 0);

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

      {/* State Filter */}
      <div>
        <div className="block text-sm font-medium text-gray-700 mb-2">Status</div>
        <div className="flex flex-wrap gap-2">
          {(['open', 'closed', 'merged', 'draft'] as const).map((state) => (
            <button
              key={state}
              type="button"
              onClick={() => handleStateChange(state)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                filters.states?.includes(state)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {state.charAt(0).toUpperCase() + state.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Authors Filter */}
      {availableAuthors.length > 0 && (
        <div>
          <div className="block text-sm font-medium text-gray-700 mb-2">Authors</div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {availableAuthors.map((author) => (
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
                <img src={author.avatarUrl} alt={author.login} className="w-4 h-4 rounded-full" />
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
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {availableBranches.map((branch) => (
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

      {/* Labels Filter */}
      {availableLabels.length > 0 && (
        <div>
          <div className="block text-sm font-medium text-gray-700 mb-2">Labels</div>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
            {availableLabels.map((label) => (
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
