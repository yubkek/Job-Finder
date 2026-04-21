/**
 * Backfill AI summaries for all jobs in the DB that don't have one yet.
 * Run with: npx tsx scheduler/backfill-summaries.ts
 */
import { db } from '@/lib/db';
import { generateSummary } from '@/lib/ai-summary';
import { logger } from '@/lib/logger';
import { sleep } from '@/lib/http-client';

async function main() {
  const jobs = await db.job.findMany({
    where: { summary: null },
    select: { id: true, title: true, company: true, description: true },
  });

  logger.info(`[backfill] ${jobs.length} jobs without summaries`);

  if (jobs.length === 0) {
    logger.info('[backfill] Nothing to do.');
    return;
  }

  let done = 0;
  for (const job of jobs) {
    if (!job.description) { done++; continue; }

    const summary = await generateSummary(job.title, job.company, job.description);
    if (summary) {
      await db.job.update({ where: { id: job.id }, data: { summary } });
      done++;
      logger.info(`[backfill] ${done}/${jobs.length} — ${job.title} @ ${job.company}`);
    }

    await sleep(300); // stay within Groq free-tier rate limit
  }

  logger.info(`[backfill] Done. ${done} summaries generated.`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
