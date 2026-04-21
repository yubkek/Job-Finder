import { load } from 'cheerio';
import { fetchWithRetry, sleep } from '@/lib/http-client';
import { logger } from '@/lib/logger';
import type { AdapterConfig, RawJob } from '@/types';
import { BaseAdapter } from './base';

const SEARCH_TERMS = [
  'graduate software engineer',
  'junior developer',
  'software intern',
  'data analyst',
  'machine learning',
];

export class JoraAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  async fetchJobs(location: 'sydney' | 'melbourne'): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const cityParam = location === 'sydney' ? 'sydney' : 'melbourne';
    const maxPages = this.config.maxPages ?? 3;

    for (const term of SEARCH_TERMS) {
      for (let page = 1; page <= maxPages; page++) {
        try {
          const url = `https://au.jora.com/jobs?q=${encodeURIComponent(term)}&l=${cityParam}&p=${page}`;
          const html = await fetchWithRetry<string>(url, {
            headers: { Accept: 'text/html' },
          });

          const $ = load(html);
          const cards = $('article[class*="job-card"], div[class*="result-list-item"]');

          if (cards.length === 0) break; // No results — stop paginating

          cards.each((_, el) => {
            const titleEl = $(el).find('a[class*="job-title"], h2 a, h3 a').first();
            const title = titleEl.text().trim();
            const href = titleEl.attr('href') ?? '';

            const company = $(el)
              .find('[class*="company"], [class*="employer"]')
              .first()
              .text()
              .trim();

            const locationText = $(el)
              .find('[class*="location"], [class*="suburb"]')
              .first()
              .text()
              .trim();

            const snippet = $(el)
              .find('[class*="snippet"], [class*="description"]')
              .first()
              .text()
              .trim();

            const dateText = $(el)
              .find('[class*="date"], time')
              .first()
              .text()
              .trim();

            if (!title || !href) return;

            const absoluteUrl = href.startsWith('http')
              ? href
              : `https://au.jora.com${href}`;

            jobs.push({
              source: 'jora',
              title,
              company: company || 'Unknown',
              location: locationText || `${this.locationToCity(location)}, Australia`,
              description: snippet,
              url: absoluteUrl,
              datePosted: dateText ? new Date(dateText) : undefined,
            });
          });

          logger.info(`[jora] "${term}" in ${cityParam} page ${page}: ${cards.length} cards`);
          await sleep(this.config.delayMs ?? 1_500);
        } catch (err) {
          logger.error(`[jora] Failed for "${term}" in ${cityParam} page ${page}`, {
            error: String(err),
          });
        }
      }
      await sleep(800);
    }

    return jobs;
  }
}
