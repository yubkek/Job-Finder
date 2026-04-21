'use client';

import { motion } from 'framer-motion';
import { Bookmark, BookmarkCheck, Building2, ExternalLink, MapPin, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SOURCE_COLORS, SOURCE_LABELS, timeAgo } from '@/lib/utils';
import type { JobRecord } from '@/types';

interface JobCardProps {
  job: JobRecord;
  onClick: (job: JobRecord) => void;
  onBookmark: (id: string, bookmarked: boolean) => void;
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  SE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  DATA: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  ML: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200',
  AI: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  CLOUD: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200',
  OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export function JobCard({ job, onClick, onBookmark }: JobCardProps) {
  const [bookmarked, setBookmarked] = useState(job.isBookmarked);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  async function handleBookmark(e: React.MouseEvent) {
    e.stopPropagation();
    setBookmarkLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/bookmark`, { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as { isBookmarked: boolean };
        setBookmarked(data.isBookmarked);
        onBookmark(job.id, data.isBookmarked);
      }
    } finally {
      setBookmarkLoading(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2 }}
    >
      <Card
        className="cursor-pointer transition-shadow hover:shadow-md border-border/60 hover:border-primary/30"
        onClick={() => onClick(job)}
      >
        <CardContent className="p-5">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-snug line-clamp-2 text-foreground">
                {job.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{job.company}</span>
              </div>
              {job.location && (
                <div className="flex items-center gap-1.5 mt-0.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{job.location}</span>
                </div>
              )}
            </div>

            {/* Bookmark button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-primary"
              onClick={handleBookmark}
              disabled={bookmarkLoading}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark job'}
            >
              {bookmarked ? (
                <BookmarkCheck className="h-4 w-4 text-primary" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* AI Summary */}
          {job.summary && (
            <div className="mt-3 flex gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                {job.summary}
              </p>
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {/* Role type badges */}
            {job.roleTypes.slice(0, 3).map((role) => (
              <span
                key={role}
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE_COLORS[role] ?? ROLE_BADGE_COLORS.OTHER}`}
              >
                {role}
              </span>
            ))}

            {/* Internship / Graduate tags */}
            {job.isInternship && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                Internship
              </span>
            )}
            {job.isGraduate && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                Graduate
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs ${SOURCE_COLORS[job.source] ?? ''}`}
              >
                {SOURCE_LABELS[job.source] ?? job.source}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {timeAgo(job.datePosted ?? job.createdAt)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                window.open(job.url, '_blank', 'noopener,noreferrer');
              }}
            >
              Apply <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
