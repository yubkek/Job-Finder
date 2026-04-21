import { load } from 'cheerio';
import { fetchWithRetry, sleep } from '@/lib/http-client';
import { logger } from '@/lib/logger';
import type { AdapterConfig, RawJob } from '@/types';
import { BaseAdapter } from './base';

/**
 * Seek scraper.
 *
 * ⚠️  Seek employs aggressive bot-detection (Cloudflare, JS-heavy rendering).
 *     This scraper uses realistic headers and may work for low-volume runs.
 *     For production at scale, consider using a headless browser (Playwright)
 *     or a residential proxy service.
 */

const CATEGORIES = [
  { label: 'IT jobs', param: 'information-technology' },
  { label: 'Graduate programs', param: 'graduate-programs' },
];

const SEEK_LOCATION_IDS: Record<'sydney' | 'melbourne', string> = {
  sydney: '3000', // Seek's internal "All Sydney NSW" region ID
  melbourne: '3001',
};

export class SeekAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  async fetchJobs(location: 'sydney' | 'melbourne'): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const city = this.locationToCity(location);
    const maxPages = this.config.maxPages ?? 2;

    for (const cat of CATEGORIES) {
      for (let page = 1; page <= maxPages; page++) {
        try {
          const url = `https://www.seek.com.au/${cat.param}-jobs/in-${location}`;
          const params: Record<string, string | number> = {
            page,
            daterange: 30,
          };

          const html = await fetchWithRetry<string>(url, {
            params,
            headers: {
              Accept: 'text/html,application/xhtml+xml',
              Referer: 'https://www.seek.com.au/',
              'Cache-Control': 'no-cache',
            },
          });

          const $ = load(html);

          // Seek renders job cards as <article data-card-type="JobCard">
          const cards = $('article[data-card-type="JobCard"], [data-automation="normalJob"]');

          if (cards.length === 0) {
            logger.warn(`[seek] No cards found for ${cat.label} in ${city} p${page} — site structure may have changed`);
            break;
          }

          cards.each((_, el) => {
            const titleEl = $(el).find('[data-automation="jobTitle"], h3 a, h2 a').first();
            const title = titleEl.text().trim();
            const href = titleEl.attr('href') ?? '';

            const company = $(el)
              .find('[data-automation="jobCompany"]')
              .first()
              .text()
              .trim();

            const locationText = $(el)
              .find('[data-automation="jobLocation"]')
              .first()
              .text()
              .trim();

            const dateText = $(el)
              .find('[data-automation="jobListingDate"]')
              .first()
              .text()
              .trim();

            if (!title || !href) return;

            const absoluteUrl = href.startsWith('http')
              ? href
              : `https://www.seek.com.au${href}`;

            jobs.push({
              source: 'seek',
              title,
              company: company || 'Unknown',
              location: locationText || `${city}, Australia`,
              url: absoluteUrl,
              datePosted: dateText || undefined,
            });
          });

          logger.info(`[seek] ${cat.label} in ${city} page ${page}: ${cards.length} jobs`);
          await sleep(this.config.delayMs ?? 2_000);
        } catch (err) {
          logger.error(`[seek] Failed for ${cat.label} in ${city} page ${page}`, {
            error: String(err),
          });
        }
      }
      await sleep(1_500);
    }

    return jobs;
  }
}
