import { load } from 'cheerio';
import { fetchWithRetry, sleep } from '@/lib/http-client';
import { logger } from '@/lib/logger';
import type { AdapterConfig, RawJob } from '@/types';
import { BaseAdapter } from './base';

/**
 * GradConnection scraper.
 * GradConnection is Australia's largest graduate jobs board.
 * URL: https://au.gradconnection.com
 */

const CATEGORIES = [
  '/internships/information-technology/',
  '/graduate-jobs/information-technology/',
  '/internships/engineering-software/',
  '/graduate-jobs/engineering-software/',
];

export class GradConnectionAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  async fetchJobs(location: 'sydney' | 'melbourne'): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const city = this.locationToCity(location);
    const maxPages = this.config.maxPages ?? 3;

    for (const category of CATEGORIES) {
      for (let page = 1; page <= maxPages; page++) {
        try {
          const url = `https://au.gradconnection.com${category}`;
          const html = await fetchWithRetry<string>(url, {
            params: { location: city, page },
            headers: {
              Accept: 'text/html',
              Referer: 'https://au.gradconnection.com/',
            },
          });

          const $ = load(html);

          // GradConnection uses Bootstrap-style listings
          const cards = $(
            '.internship, .graduate-job, .job-listing, article, div[class*="listing"]'
          );

          if (cards.length === 0) {
            // Try alternate selectors
            const altCards = $('div[class*="employer-result"], div[class*="opportunity"]');
            if (altCards.length === 0) break;
          }

          const allCards = cards.length > 0 ? cards : $('div[class*="employer"]');

          allCards.each((_, el) => {
            const titleEl = $(el).find('h2 a, h3 a, a[class*="title"]').first();
            const title = titleEl.text().trim();
            const href = titleEl.attr('href') ?? '';

            const company = $(el)
              .find('[class*="employer"], [class*="company"]')
              .first()
              .text()
              .trim();

            const locationText = $(el)
              .find('[class*="location"], [class*="city"]')
              .first()
              .text()
              .trim();

            const description = $(el)
              .find('[class*="description"], [class*="snippet"], p')
              .first()
              .text()
              .trim();

            const closingDate = $(el)
              .find('[class*="closing"], [class*="deadline"], [class*="date"]')
              .first()
              .text()
              .trim();

            if (!title || !href) return;

            const absoluteUrl = href.startsWith('http')
              ? href
              : `https://au.gradconnection.com${href}`;

            // Check if this listing matches the location filter
            if (
              locationText &&
              !locationText.toLowerCase().includes(location) &&
              !locationText.toLowerCase().includes('all australia') &&
              !locationText.toLowerCase().includes('remote')
            ) {
              return; // Skip jobs not in target location
            }

            jobs.push({
              source: 'gradconnection',
              title,
              company: company || 'Unknown',
              location: locationText || `${city}, Australia`,
              description,
              url: absoluteUrl,
              datePosted: closingDate || undefined,
            });
          });

          logger.info(`[gradconnection] ${category} in ${city} page ${page}: ${allCards.length} cards`);
          await sleep(this.config.delayMs ?? 1_500);
        } catch (err) {
          logger.error(`[gradconnection] Failed for ${category} in ${city}`, {
            error: String(err),
          });
        }
      }
      await sleep(1_000);
    }

    return jobs;
  }
}
