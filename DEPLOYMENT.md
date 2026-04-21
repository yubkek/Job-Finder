# JobFinder AU — Deployment Guide

## Prerequisites

- Node.js 20+
- A Supabase project (or any PostgreSQL database)
- An Adzuna developer account
- A Jooble API key
- An OpenAI API key (optional, for AI summaries)

---

## 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in every value:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection pooling (Transaction) |
| `DIRECT_URL` | Supabase → Project Settings → Database → Direct connection |
| `ADZUNA_APP_ID` | https://developer.adzuna.com → Sign up |
| `ADZUNA_APP_KEY` | Same as above |
| `JOOBLE_API_KEY` | https://jooble.org/api/about → Request API access |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys |
| `CRON_SECRET` | Generate: `openssl rand -hex 32` |

---

## 2. Database Setup

### Using Supabase (recommended)

1. Create a new project at https://supabase.com
2. Copy the connection strings into `.env.local`
3. Run migrations:

```bash
npm install
npm run db:generate
npm run db:push
```

### Using Railway or any PostgreSQL

1. Create a PostgreSQL database
2. Set `DATABASE_URL` and `DIRECT_URL` to the same connection string
3. Run `npm run db:push`

---

## 3. Local Development

```bash
# Install dependencies
npm install

# Set up the database
npm run db:push

# Start Next.js dev server
npm run dev
```

Open http://localhost:3000

---

## 4. Running the Scraper

### Once (for testing)

```bash
npm run scrape:once
```

### Continuous scheduler (every 4 hours)

```bash
npm run scheduler
```

This runs as a long-lived Node.js process. Use `pm2` or `systemd` to keep it alive in production.

---

## 5. Deploying to Vercel

### Step 1: Connect repo

```bash
npm install -g vercel
vercel
```

### Step 2: Set environment variables

In the Vercel dashboard → Project → Settings → Environment Variables, add all variables from `.env.local`.

### Step 3: Configure Vercel Cron

The `vercel.json` already configures a cron job:
```json
{
  "crons": [{ "path": "/api/cron/scrape", "schedule": "0 */4 * * *" }]
}
```

Vercel will call `/api/cron/scrape` every 4 hours and pass an `Authorization: Bearer <CRON_SECRET>` header.

> **Note**: Vercel Cron requires the **Pro** plan. On the Hobby plan, use an external cron service (see below).

### Step 4: Deploy

```bash
vercel --prod
```

---

## 6. Alternative: External Cron (Free)

If you're on Vercel Hobby, use a free cron service like https://cron-job.org:

1. Create an account
2. Add a new cron job:
   - URL: `https://your-domain.vercel.app/api/scrape`
   - Method: POST
   - Header: `x-cron-secret: <your CRON_SECRET>`
   - Schedule: Every 4 hours

---

## 7. Deploying the Scheduler on Railway

For the standalone scheduler (alternative to Vercel Cron):

1. Create a Railway project
2. Add a service from your repo
3. Set the start command: `npm run scheduler`
4. Add all environment variables
5. Deploy

---

## 8. Monitoring

### Scraper logs

```
GET /api/scrape/logs
```

Returns the 50 most recent scraper run records, including:
- Jobs found and added per source
- Error messages
- Duration

### Database inspection

```bash
npm run db:studio
```

Opens Prisma Studio at http://localhost:5555

---

## 9. Adding New Greenhouse Companies

Edit `adapters/greenhouse.ts` and add to the `GREENHOUSE_COMPANIES` array:

```typescript
{ slug: 'company-slug', name: 'Display Name' },
```

The slug is the identifier from the Greenhouse URL:
`https://boards.greenhouse.io/{slug}/jobs`

---

## 10. Adding New Job Sources

1. Create `adapters/your-source.ts` extending `BaseAdapter`
2. Implement `fetchJobs(location)` returning `RawJob[]`
3. Register it in `adapters/index.ts`
4. The normaliser, deduplicator, and scheduler handle the rest automatically

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Vercel / Railway                       │
│                                                           │
│  ┌──────────┐    ┌─────────────────────────────────────┐ │
│  │  Cron    │───▶│           Scraper Pipeline           │ │
│  │ (4h)     │    │  Adapters → Normalise → Deduplicate  │ │
│  └──────────┘    │  → AI Summary → Save to DB           │ │
│                  └───────────────────┬─────────────────┘ │
│                                      │                    │
│  ┌──────────────────────────────┐    │                    │
│  │     Next.js App              │    ▼                    │
│  │  ┌────────────────────────┐  │  ┌──────────────────┐  │
│  │  │  /api/jobs (GET)       │◀─┼─▶│  PostgreSQL       │  │
│  │  │  /api/jobs/:id         │  │  │  (Supabase)       │  │
│  │  │  /api/jobs/:id/bookmark│  │  └──────────────────┘  │
│  │  └────────────────────────┘  │                         │
│  │  ┌────────────────────────┐  │                         │
│  │  │  Dashboard UI          │  │                         │
│  │  │  - Location toggle     │  │                         │
│  │  │  - Role/keyword filter │  │                         │
│  │  │  - Job cards + modal   │  │                         │
│  │  │  - Bookmarks           │  │                         │
│  │  └────────────────────────┘  │                         │
│  └──────────────────────────────┘                         │
└──────────────────────────────────────────────────────────┘
```
