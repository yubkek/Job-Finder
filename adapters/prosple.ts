import { load } from 'cheerio';
import { fetchWithRetry, sleep } from '@/lib/http-client';
import { logger } from '@/lib/logger';
import type { AdapterConfig, RawJob } from '@/types';
import { BaseAdapter } from './base';

/**
 * Prosple scraper (formerly GradAustralia).
 * Prosple hosts graduate and internship opportunities across Australia.
 * URL: https://au.prosple.com
 */

const SEARCH_PATHS = [
  '/search/opportunities?type=Internship&study_field=IT+%26+Computer+Science',
  '/search/opportunities?type=Graduate+Job&study_field=IT+%26+Computer+Science',
  '/search/opportunities?type=Internship&study_field=Engineering+%26+Mathematics',
  '/search/opportunities?type=Graduate+Job&study_field=Engineering+%26+Mathematics',
];

export class ProspleAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  async fetchJobs(location: 'sydney' | 'melbourne'): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const city = this.locationToCity(location);
    const maxPages = this.config.maxPages ?? 3;

    for (const path of SEARCH_PATHS) {
      for (let page = 1; page <= maxPages; page++) {
        try {
          const url = `https://au.prosple.com${path}&location=${encodeURIComponent(city)}&page=${page}`;
          const html = await fetchWithRetry<string>(url, {
            headers: {
              Accept: 'text/html',
              Referer: 'https://au.prosple.com/',
            },
          });

          const $ = load(html);

          // Prosple uses React but server-side renders job cards
          const cards = $(
            'article, div[class*="opportunity-card"], div[class*="job-card"], div[class*="listing"]'
          );

          if (cards.length === 0) break;

          cards.each((_, el) => {
            const titleEl = $(el).find('h2 a, h3 a, a[class*="title"]').first();
            const title = titleEl.text().trim();
            const href = titleEl.attr('href') ?? '';

            const company = $(el)
              .find('[class*="company"], [class*="employer"], [class*="organisation"]')
              .first()
              .text()
              .trim();

            const locationText = $(el)
              .find('[class*="location"], [class*="city"]')
              .first()
              .text()
              .trim();

            const description = $(el)
              .find('[class*="description"], [class*="summary"], p')
              .first()
              .text()
              .trim();

            const deadline = $(el)
              .find('[class*="deadline"], [class*="closing"], [class*="close"]')
              .first()
              .text()
              .trim();

            if (!title || !href) return;

            const absoluteUrl = href.startsWith('http')
              ? href
              : `https://au.prosple.com${href}`;

            jobs.push({
              source: 'prosple',
              title,
              company: company || 'Unknown',
              location: locationText || `${city}, Australia`,
              description,
              url: absoluteUrl,
              datePosted: deadline || undefined,
            });
          });

          logger.info(`[prosple] ${path.split('?')[0]} in ${city} page ${page}: ${cards.length} cards`);
          await sleep(this.config.delayMs ?? 1_500);
        } catch (err) {
          logger.error(`[prosple] Failed for ${path} in ${city}`, {
            error: String(err),
          });
        }
      }
      await sleep(1_000);
    }

    return jobs;
  }
}
