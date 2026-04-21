'use client';

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { JobFilters, RoleType } from '@/types';

interface FilterBarProps {
  filters: JobFilters;
  onChange: (next: Partial<JobFilters>) => void;
  total: number;
}

const ROLE_OPTIONS: Array<{ value: RoleType | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'SE', label: 'Software Eng' },
  { value: 'DATA', label: 'Data' },
  { value: 'ML', label: 'Machine Learning' },
  { value: 'AI', label: 'AI / LLM' },
  { value: 'CLOUD', label: 'Cloud / DevOps' },
  { value: 'OTHER', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

export function FilterBar({ filters, onChange, total }: FilterBarProps) {
  const hasActiveFilters =
    (filters.roleType && filters.roleType !== 'ALL') ||
    filters.keyword ||
    filters.isInternship ||
    filters.isGraduate ||
    filters.bookmarked;

  function clearFilters() {
    onChange({
      roleType: 'ALL',
      keyword: undefined,
      isInternship: undefined,
      isGraduate: undefined,
      bookmarked: undefined,
    });
  }

  return (
    <div className="space-y-3">
      {/* Search + Sort row */}
      <div className="flex gap-3 flex-wrap sm:flex-nowrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search title, company, skills..."
            className="pl-9"
            value={filters.keyword ?? ''}
            onChange={(e) => onChange({ keyword: e.target.value || undefined, page: 1 })}
          />
          {filters.keyword && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => onChange({ keyword: undefined, page: 1 })}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Role type */}
        <Select
          value={filters.roleType ?? 'ALL'}
          onValueChange={(v) => onChange({ roleType: v as RoleType | 'ALL', page: 1 })}
        >
          <SelectTrigger className="w-[160px] flex-shrink-0">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          value={filters.sortBy ?? 'newest'}
          onValueChange={(v) => onChange({ sortBy: v as 'newest' | 'oldest', page: 1 })}
        >
          <SelectTrigger className="w-[140px] flex-shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Toggle filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground flex-shrink-0" />

        <ToggleChip
          active={!!filters.isInternship}
          onClick={() => onChange({ isInternship: filters.isInternship ? undefined : true, page: 1 })}
          label="🎓 Internships"
        />
        <ToggleChip
          active={!!filters.isGraduate}
          onClick={() => onChange({ isGraduate: filters.isGraduate ? undefined : true, page: 1 })}
          label="🎓 Graduate"
        />
        <ToggleChip
          active={!!filters.bookmarked}
          onClick={() => onChange({ bookmarked: filters.bookmarked ? undefined : true, page: 1 })}
          label="🔖 Saved"
        />

        {/* Result count */}
        <span className="ml-auto text-sm text-muted-foreground">
          {total.toLocaleString()} job{total !== 1 ? 's' : ''}
        </span>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
            <X className="h-3 w-3" /> Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
      }`}
    >
      {label}
    </button>
  );
}
