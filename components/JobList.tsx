'use client';

import { AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobCard } from './JobCard';
import { SkeletonGrid } from './SkeletonCard';
import type { JobRecord } from '@/types';

interface JobListProps {
  jobs: JobRecord[];
  loading: boolean;
  total: number;
  page: number;
  totalPages: number;
  onSelectJob: (job: JobRecord) => void;
  onBookmark: (id: string, bookmarked: boolean) => void;
  onPageChange: (page: number) => void;
}

export function JobList({
  jobs,
  loading,
  total,
  page,
  totalPages,
  onSelectJob,
  onBookmark,
  onPageChange,
}: JobListProps) {
  if (loading) return <SkeletonGrid count={9} />;

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h3 className="text-lg font-semibold text-foreground">No jobs found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Try adjusting your filters or broadening your search.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onClick={onSelectJob}
              onBookmark={onBookmark}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="gap-1"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
