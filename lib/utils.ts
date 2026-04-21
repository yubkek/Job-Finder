import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes without conflicts */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date as "X days ago" or a short date string */
export function timeAgo(date: Date | string | null): string {
  if (!date) return 'Unknown date';
  const d = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Source display names */
export const SOURCE_LABELS: Record<string, string> = {
  adzuna: 'Adzuna',
  jooble: 'Jooble',
  jora: 'Jora',
  seek: 'Seek',
  'workforce-australia': 'Workforce AU',
  gradconnection: 'GradConnection',
  prosple: 'Prosple',
  wellfound: 'Wellfound',
  otta: 'Otta',
  greenhouse: 'Greenhouse',
};

/** Role type display labels */
export const ROLE_LABELS: Record<string, string> = {
  SE: 'Software Eng',
  DATA: 'Data',
  ML: 'Machine Learning',
  AI: 'AI',
  CLOUD: 'Cloud/DevOps',
  OTHER: 'Other',
};

/** Source badge colours */
export const SOURCE_COLORS: Record<string, string> = {
  adzuna: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  jooble: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  jora: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  seek: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'workforce-australia': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  gradconnection: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  prosple: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  wellfound: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  otta: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  greenhouse: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
};
