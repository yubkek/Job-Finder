import { db } from './db';
import type { NormalizedJob } from '@/types';

/**
 * Filter a list of normalised jobs to only those whose urlHash
 * does not already exist in the database.
 */
export async function deduplicateJobs(jobs: NormalizedJob[]): Promise<NormalizedJob[]> {
  if (jobs.length === 0) return [];

  const hashes = jobs.map((j) => j.urlHash);

  // Single query to find all existing hashes
  const existing = await db.job.findMany({
    where: { urlHash: { in: hashes } },
    select: { urlHash: true },
  });

  const existingSet = new Set(existing.map((r) => r.urlHash));
  return jobs.filter((j) => !existingSet.has(j.urlHash));
}

/**
 * Upsert jobs into the database (idempotent by urlHash).
 * Returns the count of newly created records.
 */
export async function saveJobs(jobs: NormalizedJob[]): Promise<number> {
  if (jobs.length === 0) return 0;

  let created = 0;

  // Process in batches to avoid overwhelming the DB
  const BATCH_SIZE = 50;
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((job) =>
        db.job.upsert({
          where: { urlHash: job.urlHash },
          create: {
            externalId: job.externalId ?? null,
            source: job.source,
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description || null,
            summary: job.summary ?? null,
            url: job.url,
            urlHash: job.urlHash,
            datePosted: job.datePosted ?? null,
            roleTypes: job.roleTypes,
            locationTags: job.locationTags,
            isInternship: job.isInternship,
            isGraduate: job.isGraduate,
          },
          update: {
            // Only update mutable fields; preserve bookmarks and summaries
            title: job.title,
            description: job.description || null,
            summary: job.summary ?? undefined,
            datePosted: job.datePosted ?? undefined,
            roleTypes: job.roleTypes,
            locationTags: job.locationTags,
            isInternship: job.isInternship,
            isGraduate: job.isGraduate,
          },
        }),
      ),
    );

    for (const r of results) {
      if (r.status === 'fulfilled') created++;
    }
  }

  return created;
}
