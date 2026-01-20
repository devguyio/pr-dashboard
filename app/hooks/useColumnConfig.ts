'use client';

import { useEffect } from 'react';
import type { ColumnConfig } from '../types';

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'number', label: '#', visible: true, order: 0, width: 80, sortable: true },
  { id: 'title', label: 'Title', visible: true, order: 1, width: 400, sortable: true },
  { id: 'repository', label: 'Repository', visible: true, order: 2, width: 200, sortable: true },
  { id: 'author', label: 'Author', visible: true, order: 3, width: 150, sortable: true },
  { id: 'state', label: 'Status', visible: true, order: 4, width: 100, sortable: true },
  { id: 'age', label: 'Created', visible: true, order: 5, width: 180, sortable: true },
  { id: 'labels', label: 'Labels', visible: true, order: 6, width: 200 },
  { id: 'assignees', label: 'Assignees', visible: false, order: 7, width: 150 },
  { id: 'reviewers', label: 'Reviewers', visible: true, order: 8, width: 150 },
  { id: 'createdAt', label: 'Created', visible: false, order: 9, width: 120, sortable: true },
  { id: 'updatedAt', label: 'Updated', visible: true, order: 10, width: 120, sortable: true },
  { id: 'comments', label: 'Comments', visible: false, order: 11, width: 100 },
  { id: 'changes', label: 'Changes', visible: false, order: 12, width: 120 },
];

const LEGACY_STORAGE_KEY = 'pr-dashboard-column-config';

interface UseColumnConfigResult {
  columns: ColumnConfig[];
}

export function useColumnConfig(): UseColumnConfigResult {
  // Clean up any previously stored column config from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }, []);

  return {
    columns: DEFAULT_COLUMNS,
  };
}
