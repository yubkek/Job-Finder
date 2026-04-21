/**
 * Standalone scheduler entry point.
 *
 * Usage:
 *   npm run scheduler          # Start cron (every 4 hours)
 *   npm run scrape:once        # Run once and exit
 *   tsx scheduler/run.ts       # Same as above
 */

import cron from 'node-cron';
import { runScraper } from './index';
import { logger } from '@/lib/logger';

const runOnce = process.argv.includes('--once');

async function main() {
  if (runOnce) {
    logger.info('[run] Running scraper once...');
    const results = await runScraper();
    console.table(
      results.map((r) => ({
        source: r.source,
        found: r.jobsFound,
        added: r.jobsAdded,
        errors: r.errors.length,
        ms: r.durationMs,
      })),
    );
    process.exit(0);
  }

  // ─── Cron: every 4 hours at minute 0 ────────────────────────────────────────
  const SCHEDULE = '0 */4 * * *';
  logger.info(`[run] Scheduler started. Cron: "${SCHEDULE}"`);

  // Run immediately on startup
  await runScraper().catch((e) => logger.error('[run] Initial run failed', { error: String(e) }));

  cron.schedule(SCHEDULE, async () => {
    logger.info('[run] Cron triggered');
    await runScraper().catch((e) =>
      logger.error('[run] Scheduled run failed', { error: String(e) }),
    );
  });
}

main().catch((err) => {
  logger.error('[run] Fatal error', { error: String(err) });
  process.exit(1);
});
