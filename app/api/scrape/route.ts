import { type NextRequest, NextResponse } from 'next/server';
import { runScraper } from '@/scheduler';

export const runtime = 'nodejs';
// Vercel max function duration — set to 300s (Pro plan); free tier is 10s
export const maxDuration = 300;

/**
 * POST /api/scrape — manually trigger a scrape run.
 * Protected by CRON_SECRET header.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get('x-cron-secret');
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await runScraper();
    return NextResponse.json({
      success: true,
      results,
      totalAdded: results.reduce((s, r) => s + r.jobsAdded, 0),
    });
  } catch (err) {
    console.error('[POST /api/scrape]', err);
    return NextResponse.json({ error: 'Scrape failed', detail: String(err) }, { status: 500 });
  }
}
