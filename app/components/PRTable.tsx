import Image from 'next/image';
import { stringToColor } from '../lib/colors';
import type { ColumnConfig, PullRequest } from '../types';

interface PRTableProps {
  pullRequests: PullRequest[];
  columns: ColumnConfig[];
  isLoading?: boolean;
  onPRClick?: (pr: PullRequest) => void;
}

export function PRTable({ pullRequests, columns, isLoading }: PRTableProps) {
  // Check if there's only one unique repository
  const uniqueRepos = new Set(pullRequests.map((pr) => pr.repository.fullName));
  const shouldHideRepoColumn = uniqueRepos.size <= 1;

  const visibleColumns = columns
    .filter((col) => col.visible)
    .filter((col) => !(col.id === 'repository' && shouldHideRepoColumn))
    .sort((a, b) => a.order - b.order);

  // Calculate age in days for a PR
  const getAgeInDays = (createdAt: Date): number => {
    const now = new Date();
    const diffInMs = now.getTime() - createdAt.getTime();
    return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading pull requests...</div>
      </div>
    );
  }

  if (pullRequests.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">No pull requests found</div>
      </div>
    );
  }

  const getStateColor = (state: PullRequest['state']) => {
    switch (state) {
      case 'open':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-red-100 text-red-800';
      case 'merged':
        return 'bg-purple-100 text-purple-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {visibleColumns.map((column) => (
              <th
                key={column.id}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {pullRequests.map((pr) => {
            const ageInDays = getAgeInDays(pr.createdAt);
            const isOld = ageInDays >= 7;
            const rowClass = isOld
              ? 'hover:bg-amber-100 transition-colors bg-amber-50'
              : 'hover:bg-gray-50 transition-colors';

            return (
              <tr key={pr.id} className={rowClass}>
                {visibleColumns.map((column) => {
                  switch (column.id) {
                    case 'number':
                      return (
                        <td
                          key={column.id}
                          className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                        >
                          #{pr.number}
                        </td>
                      );
                    case 'title':
                      return (
                        <td key={column.id} className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <a
                              href={pr.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="max-w-md truncate block hover:text-blue-600 hover:underline"
                            >
                              {pr.title}
                            </a>
                            {pr.isApproved && (
                              <span className="text-green-600 shrink-0" title="Approved">
                                ✓
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    case 'repository':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className="px-2 py-0.5 font-medium rounded-full"
                            style={{
                              backgroundColor: `#${stringToColor(pr.repository.fullName)}20`,
                              color: `#${stringToColor(pr.repository.fullName)}`,
                            }}
                          >
                            {pr.repository.fullName}
                          </span>
                        </td>
                      );
                    case 'author':
                      return (
                        <td
                          key={column.id}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          <div className="flex items-center">
                            <Image
                              src={pr.author.avatarUrl}
                              alt={pr.author.login}
                              width={24}
                              height={24}
                              className="h-6 w-6 rounded-full mr-2"
                            />
                            {pr.author.login}
                          </div>
                        </td>
                      );
                    case 'state':
                      return (
                        <td key={column.id} className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStateColor(pr.state)}`}
                          >
                            {pr.state}
                          </span>
                        </td>
                      );
                    case 'age':
                      return (
                        <td
                          key={column.id}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          <span className="text-gray-900 font-medium">
                            {pr.createdAt.toLocaleDateString()}{' '}
                            {pr.createdAt.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-gray-400 ml-1">({ageInDays}d)</span>
                        </td>
                      );
                    case 'labels':
                      return (
                        <td
                          key={column.id}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          <div className="flex flex-wrap gap-1">
                            {pr.labels.slice(0, 3).map((label) => (
                              <span
                                key={label.id}
                                className="px-2 py-1 text-xs rounded-full"
                                style={{
                                  backgroundColor: `#${label.color}20`,
                                  color: `#${label.color}`,
                                }}
                              >
                                {label.name}
                              </span>
                            ))}
                            {pr.labels.length > 3 && (
                              <span className="text-xs text-gray-400">+{pr.labels.length - 3}</span>
                            )}
                          </div>
                        </td>
                      );
                    case 'assignees':
                      return (
                        <td
                          key={column.id}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {pr.assignees.length > 0 ? pr.assignees.join(', ') : '—'}
                        </td>
                      );
                    case 'reviewers':
                      return (
                        <td
                          key={column.id}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {pr.reviewers.length > 0 ? (
                            <div className="flex items-center gap-1">
                              {pr.reviewers.map((reviewer) => (
                                <div
                                  key={reviewer.login}
                                  className="flex items-center"
                                  title={reviewer.login}
                                >
                                  <Image
                                    src={reviewer.avatarUrl}
                                    alt={reviewer.login}
                                    width={24}
                                    height={24}
                                    className="h-6 w-6 rounded-full"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                      );
                    case 'createdAt':
                      return (
                        <td
                          key={column.id}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {pr.createdAt.toLocaleDateString()}{' '}
                          {pr.createdAt.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      );
                    case 'updatedAt':
                      return (
                        <td
                          key={column.id}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          {pr.updatedAt.toLocaleDateString()}{' '}
                          {pr.updatedAt.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                      );
                    case 'comments':
                      return (
                        <td
                          key={column.id}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          💬 {pr.comments + pr.reviewComments}
                        </td>
                      );
                    case 'changes':
                      return (
                        <td
                          key={column.id}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          <span className="text-green-600">+{pr.additions}</span>
                          {' / '}
                          <span className="text-red-600">-{pr.deletions}</span>
                        </td>
                      );
                    default:
                      return (
                        <td
                          key={column.id}
                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                        >
                          —
                        </td>
                      );
                  }
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
