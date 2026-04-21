/**
 * Core scraping pipeline.
 * Runs all adapters, normalises, deduplicates, summarises, and saves jobs.
 */

import { createAllAdapters } from '@/adapters';
import { generateSummaries } from '@/lib/ai-summary';
import { saveJobs } from '@/lib/deduplicator';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import { normalizeJobs } from '@/lib/normalizer';
import type { JobSource, ScraperResult } from '@/types';

export async function runScraper(): Promise<ScraperResult[]> {
  logger.info('[scheduler] Starting scrape run');
  const results: ScraperResult[] = [];
  const adapters = createAllAdapters();

  for (const { source, adapter } of adapters) {
    const startedAt = new Date();
    const start = Date.now();
    const errors: string[] = [];
    let jobsFound = 0;
    let jobsAdded = 0;

    try {
      logger.info(`[scheduler] Running adapter: ${source}`);
      const rawJobs = await adapter.fetchAllLocations();
      jobsFound = rawJobs.length;
      logger.info(`[scheduler] ${source}: ${jobsFound} raw jobs fetched`);

      // Normalise
      const normalized = normalizeJobs(rawJobs);

      // Deduplicate (filter to new only)
      const { deduplicateJobs } = await import('@/lib/deduplicator');
      const newJobs = await deduplicateJobs(normalized);
      logger.info(`[scheduler] ${source}: ${newJobs.length} new after dedup`);

      // Generate AI summaries for new jobs
      const withSummaries = await generateSummaries(newJobs);

      // Save to database
      jobsAdded = await saveJobs(withSummaries);
      logger.info(`[scheduler] ${source}: ${jobsAdded} jobs saved`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      logger.error(`[scheduler] ${source} failed: ${msg}`);
    }

    const durationMs = Date.now() - start;

    // Persist the log entry
    await db.scraperLog
      .create({
        data: {
          source,
          status: errors.length === 0 ? 'success' : jobsFound > 0 ? 'partial' : 'error',
          jobsFound,
          jobsAdded,
          errors: errors.length > 0 ? JSON.stringify(errors) : null,
          startedAt,
          endedAt: new Date(),
          durationMs,
        },
      })
      .catch((e) => logger.error('[scheduler] Failed to save scraper log', { error: String(e) }));

    results.push({ source: source as JobSource, jobsFound, jobsAdded, errors, durationMs });
  }

  const totalAdded = results.reduce((acc, r) => acc + r.jobsAdded, 0);
  logger.info(`[scheduler] Scrape run complete. Total new jobs: ${totalAdded}`);

  return results;
}
