import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { JobFilters, PaginatedJobs } from '@/types';

export const runtime = 'nodejs';

/**
 * GET /api/jobs
 *
 * Query parameters:
 *   location    = 'sydney' | 'melbourne' | 'all'   (default: all)
 *   roleType    = 'SE' | 'DATA' | 'ML' | 'AI' | 'CLOUD' | 'OTHER' | 'ALL'
 *   keyword     = free-text search on title + company
 *   isInternship = 'true' | 'false'
 *   isGraduate  = 'true' | 'false'
 *   bookmarked  = 'true' | 'false'
 *   page        = integer (default: 1)
 *   limit       = integer (default: 20, max: 100)
 *   sortBy      = 'newest' | 'oldest' (default: newest)
 */
export async function GET(req: NextRequest): Promise<NextResponse<PaginatedJobs | { error: string }>> {
  try {
    const { searchParams } = req.nextUrl;

    const filters: JobFilters = {
      location: (searchParams.get('location') ?? 'all') as JobFilters['location'],
      roleType: (searchParams.get('roleType') ?? 'ALL') as JobFilters['roleType'],
      keyword: searchParams.get('keyword') ?? undefined,
      isInternship: searchParams.get('isInternship') === 'true' ? true : undefined,
      isGraduate: searchParams.get('isGraduate') === 'true' ? true : undefined,
      bookmarked: searchParams.get('bookmarked') === 'true' ? true : undefined,
      page: Math.max(1, parseInt(searchParams.get('page') ?? '1', 10)),
      limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10))),
      sortBy: (searchParams.get('sortBy') ?? 'newest') as 'newest' | 'oldest',
    };

    // ─── Build Prisma where clause ────────────────────────────────────────────
    const where: Parameters<typeof db.job.findMany>[0]['where'] = {};

    // Location filter
    if (filters.location && filters.location !== 'all') {
      where.locationTags = { has: filters.location.toUpperCase() };
    }

    // Role type filter
    if (filters.roleType && filters.roleType !== 'ALL') {
      where.roleTypes = { has: filters.roleType };
    }

    // Keyword search (title OR company, case-insensitive via ILIKE)
    if (filters.keyword) {
      where.OR = [
        { title: { contains: filters.keyword, mode: 'insensitive' } },
        { company: { contains: filters.keyword, mode: 'insensitive' } },
        { description: { contains: filters.keyword, mode: 'insensitive' } },
      ];
    }

    // Boolean flags
    if (filters.isInternship !== undefined) where.isInternship = filters.isInternship;
    if (filters.isGraduate !== undefined) where.isGraduate = filters.isGraduate;
    if (filters.bookmarked !== undefined) where.isBookmarked = filters.bookmarked;

    // ─── Pagination ───────────────────────────────────────────────────────────
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const orderBy: Parameters<typeof db.job.findMany>[0]['orderBy'] =
      filters.sortBy === 'oldest'
        ? [{ datePosted: 'asc' }, { createdAt: 'asc' }]
        : [{ datePosted: 'desc' }, { createdAt: 'desc' }];

    // ─── Execute queries in parallel ──────────────────────────────────────────
    const [jobs, total] = await Promise.all([
      db.job.findMany({ where, orderBy, skip, take: limit }),
      db.job.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      jobs,
      total,
      page,
      totalPages,
      hasMore: page < totalPages,
    });
  } catch (err) {
    console.error('[GET /api/jobs]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
