import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateSummary } from '@/lib/ai-summary';

export const runtime = 'nodejs';

/**
 * POST /api/jobs/[id]/summary
 * Returns the cached summary if it exists, otherwise generates one via Groq,
 * persists it, and returns it.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const job = await db.job.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, company: true, description: true, summary: true },
    });

    if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Already cached — return immediately
    if (job.summary) return NextResponse.json({ summary: job.summary });

    if (!job.description) {
      return NextResponse.json({ summary: null });
    }

    const summary = await generateSummary(job.title, job.company, job.description);

    if (summary) {
      await db.job.update({ where: { id: job.id }, data: { summary } });
    }

    return NextResponse.json({ summary: summary ?? null });
  } catch (err) {
    console.error('[POST /api/jobs/[id]/summary]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
