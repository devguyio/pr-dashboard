import type { GitHubLabel, GitHubPullRequest, GitHubRepository } from './github';

// Application-specific types
export interface Repository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  isPrivate: boolean;
  url: string;
  defaultBranch: string;
  openPRCount: number;
  lastUpdated: Date;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: 'open' | 'closed' | 'merged' | 'draft';
  author: {
    login: string;
    avatarUrl: string;
    url: string;
  };
  repository: {
    name: string;
    fullName: string;
    owner: string;
  };
  baseBranch: string; // Target branch (e.g., "main")
  headBranch: string; // Source branch (e.g., "feature/foo")
  labels: Label[];
  assignees: string[];
  reviewers: string[];
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  mergedAt?: Date;
  url: string;
  comments: number;
  reviewComments: number;
  additions: number;
  deletions: number;
  changedFiles: number;
  isDraft: boolean;
  isApproved: boolean;
}

export interface Label {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface FilterOptions {
  repositories: string[]; // Full repository names (owner/repo)
  labels: string[];
  states: PullRequest['state'][];
  branches: string[]; // Target branches (base branch)
  assignees: string[];
  authors: string[];
  reviewers: string[];
  searchQuery: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  width?: number;
  order: number;
  sortable?: boolean;
}

export type ColumnId =
  | 'number'
  | 'title'
  | 'repository'
  | 'author'
  | 'state'
  | 'age'
  | 'labels'
  | 'assignees'
  | 'reviewers'
  | 'createdAt'
  | 'updatedAt'
  | 'comments'
  | 'changes';

export interface DashboardConfig {
  columns: ColumnConfig[];
  selectedRepositories: string[];
  filters: Partial<FilterOptions>;
}

// Utility types for API responses
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  perPage: number;
  total: number;
  hasMore: boolean;
}

// Transform functions type
export type TransformFunction<TInput, TOutput> = (input: TInput) => TOutput;

// Export transform functions
export const transformRepository = (repo: GitHubRepository): Repository => ({
  id: repo.id,
  name: repo.name,
  fullName: repo.full_name,
  owner: repo.owner.login,
  isPrivate: repo.private,
  url: repo.html_url,
  defaultBranch: repo.default_branch,
  openPRCount: repo.open_issues_count,
  lastUpdated: new Date(repo.updated_at),
});

export const transformPullRequest = (pr: GitHubPullRequest): PullRequest => {
  const isMerged = !!pr.merged_at;
  const isDraft = pr.draft;
  const isClosed = pr.state === 'closed';

  let state: PullRequest['state'];
  if (isMerged) {
    state = 'merged';
  } else if (isClosed) {
    state = 'closed';
  } else if (isDraft) {
    state = 'draft';
  } else {
    state = pr.state;
  }

  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    state,
    author: {
      login: pr.user.login,
      avatarUrl: pr.user.avatar_url,
      url: pr.user.html_url,
    },
    repository: {
      name: pr.base.repo.name,
      fullName: pr.base.repo.full_name,
      owner: pr.base.repo.owner.login,
    },
    baseBranch: pr.base.ref,
    headBranch: pr.head.ref,
    labels: pr.labels.map((label) => ({
      id: label.id,
      name: label.name,
      color: label.color,
      description: label.description,
    })),
    assignees: pr.assignees.map((user) => user.login),
    reviewers: pr.requested_reviewers.map((user) => user.login),
    createdAt: new Date(pr.created_at),
    updatedAt: new Date(pr.updated_at),
    closedAt: pr.closed_at ? new Date(pr.closed_at) : undefined,
    mergedAt: pr.merged_at ? new Date(pr.merged_at) : undefined,
    url: pr.html_url,
    comments: pr.comments,
    reviewComments: pr.review_comments,
    additions: pr.additions,
    deletions: pr.deletions,
    changedFiles: pr.changed_files,
    isDraft,
    isApproved: false, // Will be set by API when fetching reviews
  };
};

export const transformLabel = (label: GitHubLabel): Label => ({
  id: label.id,
  name: label.name,
  color: label.color,
  description: label.description,
});

/**
 * Rehydrate dates in a PullRequest object received from JSON
 * This is necessary because Date objects are serialized as strings in JSON
 */
export const rehydratePullRequest = (pr: PullRequest): PullRequest => ({
  ...pr,
  createdAt: new Date(pr.createdAt),
  updatedAt: new Date(pr.updatedAt),
  closedAt: pr.closedAt ? new Date(pr.closedAt) : undefined,
  mergedAt: pr.mergedAt ? new Date(pr.mergedAt) : undefined,
});

/**
 * Rehydrate dates in a Repository object received from JSON
 */
export const rehydrateRepository = (repo: Repository): Repository => ({
  ...repo,
  lastUpdated: new Date(repo.lastUpdated),
});
