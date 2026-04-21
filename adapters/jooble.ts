import { postWithRetry, sleep } from '@/lib/http-client';
import { logger } from '@/lib/logger';
import type { AdapterConfig, RawJob } from '@/types';
import { BaseAdapter } from './base';

// ─── Jooble API types ─────────────────────────────────────────────────────────
interface JoobleJob {
  title: string;
  location: string;
  snippet: string;
  salary?: string;
  source?: string;
  type?: string;
  link: string;
  company: string;
  updated: string;
  id?: string;
}

interface JoobleResponse {
  totalCount: number;
  jobs: JoobleJob[];
}

const SEARCH_TERMS = [
  'graduate software engineer',
  'junior developer',
  'software intern',
  'data analyst graduate',
  'machine learning intern',
  'entry level developer',
];

export class JoobleAdapter extends BaseAdapter {
  private apiKey: string;

  constructor(config: AdapterConfig) {
    super(config);
    this.apiKey = process.env.JOOBLE_API_KEY ?? '';
  }

  async fetchJobs(location: 'sydney' | 'melbourne'): Promise<RawJob[]> {
    if (!this.apiKey) {
      logger.warn('[jooble] Missing JOOBLE_API_KEY — skipping');
      return [];
    }

    const jobs: RawJob[] = [];
    const city = `${this.locationToCity(location)}, Australia`;
    const url = `https://jooble.org/api/${this.apiKey}`;
    const maxPages = this.config.maxPages ?? 2;

    for (const term of SEARCH_TERMS) {
      for (let page = 1; page <= maxPages; page++) {
        try {
          const data = await postWithRetry<JoobleResponse>(
            url,
            { keywords: term, location: city, page },
            { headers: { 'Content-Type': 'application/json' } },
          );

          const results = data.jobs ?? [];
          logger.info(`[jooble] "${term}" in ${city} page ${page}: ${results.length} jobs`);

          for (const job of results) {
            jobs.push({
              externalId: job.id ? `jooble-${job.id}` : undefined,
              source: 'jooble',
              title: job.title,
              company: job.company || 'Unknown',
              location: job.location || city,
              description: job.snippet,
              url: job.link,
              datePosted: job.updated ? new Date(job.updated) : undefined,
            });
          }

          if (results.length === 0) break;
          await sleep(this.config.delayMs ?? 1_200);
        } catch (err) {
          logger.error(`[jooble] Failed for "${term}" in ${city} page ${page}`, {
            error: String(err),
          });
        }
      }
      await sleep(600);
    }

    return jobs;
  }
}
