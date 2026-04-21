import { type NextRequest, NextResponse } from 'next/server';
import { runScraper } from '@/scheduler';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * GET /api/cron/scrape — Vercel Cron endpoint.
 * Called automatically every 4 hours as configured in vercel.json.
 * Secured by the CRON_SECRET env var which Vercel passes as a header.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await runScraper();
    return NextResponse.json({
      success: true,
      totalAdded: results.reduce((s, r) => s + r.jobsAdded, 0),
      results,
    });
  } catch (err) {
    console.error('[GET /api/cron/scrape]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
