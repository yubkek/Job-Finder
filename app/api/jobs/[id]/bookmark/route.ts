import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

/** POST /api/jobs/[id]/bookmark — toggle bookmark status */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  try {
    const existing = await db.job.findUnique({
      where: { id: params.id },
      select: { isBookmarked: true },
    });

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await db.job.update({
      where: { id: params.id },
      data: { isBookmarked: !existing.isBookmarked },
      select: { id: true, isBookmarked: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[POST /api/jobs/[id]/bookmark]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
