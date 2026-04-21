# JobFinder AU 🇦🇺

A production-ready job aggregation system for **entry-level and internship tech roles** in Sydney and Melbourne.

## Features

- **10 data sources** — Adzuna (API), Jooble (API), Greenhouse (API), Jora, Seek, Workforce Australia, GradConnection, Prosple, Wellfound, Otta
- **AI summaries** — 2-4 sentence GPT-4o-mini summaries for each job
- **Smart filtering** — Location (Sydney/Melbourne), role type (SE/Data/ML/AI/Cloud), keyword search, internship/graduate toggles
- **Deduplication** — URL hash-based dedup across all sources
- **Bookmarks** — Save jobs for later
- **Auto-scheduler** — Runs every 4 hours via cron
- **Modern UI** — Next.js 14, Tailwind CSS, shadcn/ui, Framer Motion animations

## Quick Start

```bash
# 1. Clone and install
git clone <your-repo>
cd job-finder-au
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in your API keys

# 3. Set up database
npm run db:push

# 4. Start development server
npm run dev

# 5. (Optional) Run scraper once to populate data
npm run scrape:once
```

## Project Structure

```
├── adapters/           # 10 source adapters (one per platform)
│   ├── adzuna.ts       # Official API ✅
│   ├── jooble.ts       # Official API ✅
│   ├── greenhouse.ts   # Public API ✅
│   ├── jora.ts         # Cheerio scraper
│   ├── seek.ts         # Cheerio scraper (⚠️ bot-protected)
│   ├── workforce-australia.ts
│   ├── gradconnection.ts
│   ├── prosple.ts
│   ├── wellfound.ts    # React SPA (⚠️ may need Playwright)
│   └── otta.ts         # React SPA (⚠️ may need Playwright)
├── app/
│   ├── api/            # Next.js API routes
│   │   ├── jobs/       # GET /api/jobs, GET /api/jobs/:id
│   │   ├── scrape/     # POST /api/scrape (manual trigger)
│   │   └── cron/       # GET /api/cron/scrape (Vercel Cron)
│   ├── layout.tsx
│   └── page.tsx
├── components/         # React UI components
│   └── ui/             # shadcn/ui primitives
├── lib/                # Shared utilities
│   ├── db.ts           # Prisma client singleton
│   ├── normalizer.ts   # Job classification & cleaning
│   ├── deduplicator.ts # URL hash dedup
│   ├── ai-summary.ts   # OpenAI GPT-4o-mini summaries
│   └── http-client.ts  # Axios with retry & rate limiting
├── prisma/
│   └── schema.prisma   # PostgreSQL schema
├── scheduler/
│   ├── index.ts        # Core scraping pipeline
│   └── run.ts          # Standalone runner + cron
└── types/index.ts      # TypeScript types
```

## API

```
GET /api/jobs
  ?location=sydney|melbourne|all
  ?roleType=SE|DATA|ML|AI|CLOUD|OTHER|ALL
  ?keyword=<search>
  ?isInternship=true
  ?isGraduate=true
  ?bookmarked=true
  ?page=1
  ?limit=20
  ?sortBy=newest|oldest

GET /api/jobs/:id
POST /api/jobs/:id/bookmark   # Toggle bookmark
POST /api/scrape              # Manual scrape (requires x-cron-secret header)
GET  /api/scrape/logs         # Recent scraper logs
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full Vercel + Supabase deployment guide.

## Scraper Notes

| Source | Method | Reliability |
|---|---|---|
| Adzuna | Official API | ⭐⭐⭐⭐⭐ |
| Jooble | Official API | ⭐⭐⭐⭐⭐ |
| Greenhouse | Public API | ⭐⭐⭐⭐⭐ |
| Jora | Cheerio scraper | ⭐⭐⭐⭐ |
| GradConnection | Cheerio scraper | ⭐⭐⭐⭐ |
| Prosple | Cheerio scraper | ⭐⭐⭐ |
| Workforce Australia | Cheerio scraper | ⭐⭐⭐ |
| Seek | Cheerio scraper | ⭐⭐ (bot-protected) |
| Wellfound | JSON extraction | ⭐⭐ (React SPA) |
| Otta | JSON extraction | ⭐⭐ (React SPA) |

For Seek, Wellfound, and Otta, a [Playwright](https://playwright.dev/)-based scraper would be more reliable in production.
