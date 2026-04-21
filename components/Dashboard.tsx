'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BriefcaseBusiness, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterBar } from './FilterBar';
import { JobDetailModal } from './JobDetailModal';
import { JobList } from './JobList';
import { LocationToggle } from './LocationToggle';
import type { JobFilters, JobRecord, LocationFilter, PaginatedJobs } from '@/types';

const DEFAULT_FILTERS: JobFilters = {
  location: 'all',
  roleType: 'ALL',
  keyword: undefined,
  isInternship: undefined,
  isGraduate: undefined,
  bookmarked: undefined,
  page: 1,
  limit: 18,
  sortBy: 'newest',
};

export function Dashboard() {
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [data, setData] = useState<PaginatedJobs | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchJobs = useCallback(async (f: JobFilters) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.location && f.location !== 'all') params.set('location', f.location);
      if (f.roleType && f.roleType !== 'ALL') params.set('roleType', f.roleType);
      if (f.keyword) params.set('keyword', f.keyword);
      if (f.isInternship) params.set('isInternship', 'true');
      if (f.isGraduate) params.set('isGraduate', 'true');
      if (f.bookmarked) params.set('bookmarked', 'true');
      params.set('page', String(f.page ?? 1));
      params.set('limit', String(f.limit ?? 18));
      params.set('sortBy', f.sortBy ?? 'newest');

      const res = await fetch(`/api/jobs?${params}`, {
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error('Failed to fetch jobs');
      const json = (await res.json()) as PaginatedJobs;
      setData(json);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced fetch on filter change
  useEffect(() => {
    const timer = setTimeout(() => fetchJobs(filters), 200);
    return () => clearTimeout(timer);
  }, [filters, fetchJobs]);

  function updateFilters(next: Partial<JobFilters>) {
    setFilters((prev) => ({ ...prev, ...next }));
  }

  function handleLocationChange(location: LocationFilter) {
    updateFilters({ location, page: 1 });
  }

  function handleBookmarkUpdate(id: string, bookmarked: boolean) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            jobs: prev.jobs.map((j) => (j.id === id ? { ...j, isBookmarked: bookmarked } : j)),
          }
        : prev,
    );
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchJobs(filters);
    setRefreshing(false);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container max-w-7xl py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BriefcaseBusiness className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">JobFinder AU</h1>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">
                Entry-level &amp; Internships
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <LocationToggle
              value={filters.location ?? 'all'}
              onChange={handleLocationChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main className="container max-w-7xl py-6 space-y-6">
        {/* Filter bar */}
        <FilterBar
          filters={filters}
          onChange={updateFilters}
          total={data?.total ?? 0}
        />

        {/* Job list */}
        <JobList
          jobs={data?.jobs ?? []}
          loading={loading}
          total={data?.total ?? 0}
          page={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          onSelectJob={setSelectedJob}
          onBookmark={handleBookmarkUpdate}
          onPageChange={(page) => updateFilters({ page })}
        />
      </main>

      {/* ── Job detail side panel ─────────────────────────────────────── */}
      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
