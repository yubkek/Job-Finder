'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Calendar, ExternalLink, Loader2, MapPin, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SOURCE_COLORS, SOURCE_LABELS, timeAgo } from '@/lib/utils';
import type { JobRecord } from '@/types';

interface JobDetailModalProps {
  job: JobRecord | null;
  onClose: () => void;
}

const ROLE_BADGE_COLORS: Record<string, string> = {
  SE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  DATA: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  ML: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  AI: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  CLOUD: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export function JobDetailModal({ job, onClose }: JobDetailModalProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const fetchedId = useRef<string | null>(null);

  useEffect(() => {
    if (!job) { setSummary(null); fetchedId.current = null; return; }

    // Use cached summary from DB if available
    if (job.summary) { setSummary(job.summary); return; }

    // Avoid re-fetching the same job if already requested
    if (fetchedId.current === job.id) return;
    fetchedId.current = job.id;

    setSummary(null);
    setSummaryLoading(true);

    fetch(`/api/jobs/${job.id}/summary`, { method: 'POST' })
      .then((r) => r.json())
      .then((data) => setSummary(data.summary ?? null))
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [job]);

  return (
    <AnimatePresence>
      {job && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed right-0 top-0 z-50 h-full w-full max-w-2xl bg-background shadow-2xl border-l border-border flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4 border-b border-border">
              <div className="flex-1 pr-4 min-w-0">
                <h2 className="text-xl font-bold leading-tight text-foreground">{job.title}</h2>
                <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium text-foreground">{job.company}</span>
                </div>
                {job.location && (
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span>{job.location}</span>
                  </div>
                )}
                {job.datePosted && (
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>Posted {timeAgo(job.datePosted)}</span>
                  </div>
                )}
              </div>

              <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={`${SOURCE_COLORS[job.source] ?? ''}`}
                  >
                    {SOURCE_LABELS[job.source] ?? job.source}
                  </Badge>
                  {job.roleTypes.map((role) => (
                    <span
                      key={role}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE_COLORS[role] ?? ROLE_BADGE_COLORS.OTHER}`}
                    >
                      {role}
                    </span>
                  ))}
                  {job.isInternship && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                      Internship
                    </span>
                  )}
                  {job.isGraduate && (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                      Graduate
                    </span>
                  )}
                  {job.locationTags.map((loc) => (
                    <span
                      key={loc}
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      📍 {loc}
                    </span>
                  ))}
                </div>

                {/* AI Summary */}
                {(summaryLoading || summary) && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                        AI Summary
                      </span>
                      {summaryLoading && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500 ml-auto" />
                      )}
                    </div>
                    {summaryLoading ? (
                      <div className="space-y-2">
                        <div className="h-3 bg-amber-200/60 dark:bg-amber-800/40 rounded animate-pulse w-full" />
                        <div className="h-3 bg-amber-200/60 dark:bg-amber-800/40 rounded animate-pulse w-5/6" />
                        <div className="h-3 bg-amber-200/60 dark:bg-amber-800/40 rounded animate-pulse w-4/6" />
                      </div>
                    ) : (
                      <p className="text-sm text-foreground leading-relaxed">{summary}</p>
                    )}
                  </div>
                )}

                {/* Full description */}
                {job.description && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">
                      Full Description
                    </h3>
                    <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {job.description}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer CTA */}
            <div className="p-6 pt-4 border-t border-border">
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => window.open(job.url, '_blank', 'noopener,noreferrer')}
              >
                Apply on {SOURCE_LABELS[job.source] ?? job.source}
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
