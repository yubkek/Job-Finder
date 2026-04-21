import { fetchWithRetry, sleep } from '@/lib/http-client';
import { logger } from '@/lib/logger';
import type { AdapterConfig, RawJob } from '@/types';
import { BaseAdapter } from './base';

// ─── Adzuna API types ─────────────────────────────────────────────────────────
interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  created: string; // ISO date string
}

interface AdzunaResponse {
  results: AdzunaJob[];
  count: number;
}

// ─── Search terms for entry-level / grad / intern roles ───────────────────────
const SEARCH_TERMS = [
  'graduate software engineer',
  'junior software developer',
  'software engineer intern',
  'data analyst graduate',
  'machine learning graduate',
  'junior developer',
  'entry level engineer',
];

export class AdzunaAdapter extends BaseAdapter {
  private appId: string;
  private appKey: string;
  private readonly resultsPerPage = 50;

  constructor(config: AdapterConfig) {
    super(config);
    this.appId = process.env.ADZUNA_APP_ID ?? '';
    this.appKey = process.env.ADZUNA_APP_KEY ?? '';
  }

  async fetchJobs(location: 'sydney' | 'melbourne'): Promise<RawJob[]> {
    if (!this.appId || !this.appKey) {
      logger.warn('[adzuna] Missing ADZUNA_APP_ID or ADZUNA_APP_KEY — skipping');
      return [];
    }

    const jobs: RawJob[] = [];
    const city = this.locationToCity(location);
    const maxPages = this.config.maxPages ?? 2;

    for (const term of SEARCH_TERMS) {
      for (let page = 1; page <= maxPages; page++) {
        try {
          const url = `https://api.adzuna.com/v1/api/jobs/au/search/${page}`;
          const data = await fetchWithRetry<AdzunaResponse>(url, {
            params: {
              app_id: this.appId,
              app_key: this.appKey,
              results_per_page: this.resultsPerPage,
              what: term,
              where: city,
              'content-type': 'application/json',
              sort_by: 'date',
              days_old: 30,
            },
          });

          const results = data.results ?? [];
          logger.info(`[adzuna] "${term}" in ${city} page ${page}: ${results.length} jobs`);

          for (const job of results) {
            jobs.push({
              externalId: `adzuna-${job.id}`,
              source: 'adzuna',
              title: job.title,
              company: job.company.display_name,
              location: job.location.display_name,
              description: job.description,
              url: job.redirect_url,
              datePosted: new Date(job.created),
            });
          }

          // No more pages if fewer results than page size
          if (results.length < this.resultsPerPage) break;
          await sleep(this.config.delayMs ?? 1_000);
        } catch (err) {
          logger.error(`[adzuna] Failed for "${term}" in ${city} page ${page}`, {
            error: String(err),
          });
        }
      }
      await sleep(500);
    }

    return jobs;
  }
}
