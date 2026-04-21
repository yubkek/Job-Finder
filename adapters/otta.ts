import { load } from 'cheerio';
import { fetchWithRetry, sleep } from '@/lib/http-client';
import { logger } from '@/lib/logger';
import type { AdapterConfig, RawJob } from '@/types';
import { BaseAdapter } from './base';

/**
 * Otta scraper.
 * Otta curates tech jobs for software engineers and data professionals.
 * URL: https://app.otta.com
 *
 * ⚠️  Otta is a React SPA. This adapter attempts to parse embedded JSON data
 *     from server-rendered pages. A Playwright fallback may be needed for
 *     reliable production use if the JSON approach stops working.
 */

export class OttaAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  async fetchJobs(_location: 'sydney' | 'melbourne'): Promise<RawJob[]> {
    // Otta was acquired by Beamery — the app.otta.com search endpoint now
    // returns 404. Disabled until a working API/URL is identified.
    logger.warn('[otta] Endpoint unavailable (acquired by Beamery) — skipping');
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async _fetchJobs(location: 'sydney' | 'melbourne'): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const city = this.locationToCity(location);

    const searchQueries = [
      'software engineer',
      'data analyst',
      'machine learning',
      'junior developer',
    ];

    for (const query of searchQueries) {
      try {
        // Otta's web app — try to fetch search results
        const url = `https://app.otta.com/jobs/search`;
        const html = await fetchWithRetry<string>(url, {
          params: {
            q: query,
            location: `${city}, Australia`,
          },
          headers: {
            Accept: 'text/html',
            Referer: 'https://app.otta.com/',
          },
        });

        const $ = load(html);

        // Try to extract embedded JSON data (Otta uses Next.js)
        const nextDataScript = $('#__NEXT_DATA__').html();
        if (nextDataScript) {
          const parsed = JSON.parse(nextDataScript) as {
            props?: {
              pageProps?: {
                jobs?: Array<{
                  id: string;
                  title: string;
                  company?: { name: string };
                  locationText?: string;
                  locations?: Array<{ text: string }>;
                  externalUrl?: string;
                  publishedAt?: string;
                  bullets?: string[];
                }>;
              };
            };
          };

          const jobList = parsed?.props?.pageProps?.jobs ?? [];
          for (const job of jobList) {
            const locationText =
              job.locationText ??
              job.locations?.map((l) => l.text).join(', ') ??
              `${city}, Australia`;

            jobs.push({
              externalId: `otta-${job.id}`,
              source: 'otta',
              title: job.title,
              company: job.company?.name ?? 'Unknown',
              location: locationText,
              description: job.bullets?.join('\n') ?? '',
              url: job.externalUrl ?? `https://app.otta.com/jobs/${job.id}`,
              datePosted: job.publishedAt ? new Date(job.publishedAt) : undefined,
            });
          }

          logger.info(`[otta] "${query}" in ${city}: ${jobList.length} jobs`);
        } else {
          // Fallback: scrape visible HTML cards
          const cards = $('[class*="job"], [class*="role"], article');
          logger.warn(`[otta] No __NEXT_DATA__ for "${query}" — found ${cards.length} HTML cards`);

          cards.each((_, el) => {
            const titleEl = $(el).find('h2 a, h3 a, a[class*="title"]').first();
            const title = titleEl.text().trim();
            const href = titleEl.attr('href') ?? '';
            const company = $(el).find('[class*="company"]').first().text().trim();
            const loc = $(el).find('[class*="location"]').first().text().trim();

            if (!title || !href) return;
            const absoluteUrl = href.startsWith('http') ? href : `https://app.otta.com${href}`;
            jobs.push({
              source: 'otta',
              title,
              company: company || 'Unknown',
              location: loc || `${city}, Australia`,
              url: absoluteUrl,
            });
          });
        }

        await sleep(this.config.delayMs ?? 2_000);
      } catch (err) {
        logger.error(`[otta] Failed for "${query}" in ${city}`, {
          error: String(err),
        });
      }
    }

    return jobs;
  }
}
