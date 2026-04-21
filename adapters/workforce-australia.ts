import { load } from 'cheerio';
import { fetchWithRetry, sleep } from '@/lib/http-client';
import { logger } from '@/lib/logger';
import type { AdapterConfig, RawJob } from '@/types';
import { BaseAdapter } from './base';

/**
 * Workforce Australia scraper.
 * Uses the public job search on workforceaustralia.gov.au.
 * The site is a government service and is generally scraper-friendly.
 */

const SEARCH_TERMS = [
  'software engineer graduate',
  'data analyst graduate',
  'IT intern',
  'junior developer',
  'technology graduate',
];

export class WorkforceAustraliaAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  async fetchJobs(location: 'sydney' | 'melbourne'): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const city = this.locationToCity(location);
    const maxPages = this.config.maxPages ?? 2;

    for (const term of SEARCH_TERMS) {
      for (let page = 1; page <= maxPages; page++) {
        try {
          // Workforce Australia search URL
          const url = 'https://www.workforceaustralia.gov.au/individuals/jobs/results';
          const html = await fetchWithRetry<string>(url, {
            params: {
              searchTerm: term,
              location: city,
              page,
            },
            headers: {
              Accept: 'text/html',
              Referer: 'https://www.workforceaustralia.gov.au/',
            },
          });

          const $ = load(html);

          // The site uses article tags with class containing "job-search-result"
          const cards = $('article, div[class*="job-result"], div[class*="vacancy"]');

          if (cards.length === 0) break;

          cards.each((_, el) => {
            const titleEl = $(el).find('h2 a, h3 a, a[class*="title"]').first();
            const title = titleEl.text().trim();
            const href = titleEl.attr('href') ?? '';

            const company = $(el)
              .find('[class*="employer"], [class*="company"]')
              .first()
              .text()
              .trim();

            const locationText = $(el)
              .find('[class*="location"], [class*="suburb"]')
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
              : `https://www.workforceaustralia.gov.au${href}`;

            jobs.push({
              source: 'workforce-australia',
              title,
              company: company || 'Unknown',
              location: locationText || `${city}, Australia`,
              url: absoluteUrl,
              datePosted: dateText || undefined,
            });
          });

          logger.info(`[workforce-au] "${term}" in ${city} page ${page}: ${cards.length} jobs`);
          await sleep(this.config.delayMs ?? 1_500);
        } catch (err) {
          logger.error(`[workforce-au] Failed for "${term}" in ${city}`, {
            error: String(err),
          });
        }
      }
      await sleep(800);
    }

    return jobs;
  }
}
