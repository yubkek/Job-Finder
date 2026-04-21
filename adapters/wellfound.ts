import { load } from 'cheerio';
import { fetchWithRetry, sleep } from '@/lib/http-client';
import { logger } from '@/lib/logger';
import type { AdapterConfig, RawJob } from '@/types';
import { BaseAdapter } from './base';

/**
 * Wellfound (formerly AngelList Talent) scraper.
 * Wellfound focuses on startup jobs and has Australian tech listings.
 * URL: https://wellfound.com/jobs
 *
 * ⚠️  Wellfound is a React SPA. This scraper uses their server-side rendered
 *     search pages. Results may be limited. A Playwright-based solution
 *     would capture more roles if this becomes insufficient.
 */

const ROLES = [
  'software-engineer',
  'data-scientist',
  'machine-learning-engineer',
  'backend-engineer',
  'full-stack-engineer',
];

export class WellfoundAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  async fetchJobs(_location: 'sydney' | 'melbourne'): Promise<RawJob[]> {
    // Wellfound uses Cloudflare bot protection — all requests return 403.
    // Disabled until Playwright support is added.
    logger.warn('[wellfound] Blocked by Cloudflare — skipping');
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async _fetchJobs(location: 'sydney' | 'melbourne'): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const city = location === 'sydney' ? 'Sydney%2C+Australia' : 'Melbourne%2C+Australia';

    for (const role of ROLES) {
      try {
        // Wellfound uses query-string filtered pages that are partially SSR
        const url = `https://wellfound.com/role/l/${role}/${city.toLowerCase()}`;
        const html = await fetchWithRetry<string>(url, {
          headers: {
            Accept: 'text/html',
            Referer: 'https://wellfound.com/',
          },
        });

        const $ = load(html);

        // Wellfound embeds job data in a Next.js __NEXT_DATA__ script tag
        const nextDataScript = $('#__NEXT_DATA__').html();
        if (nextDataScript) {
          const parsed = JSON.parse(nextDataScript) as {
            props?: {
              pageProps?: {
                jobs?: Array<{
                  id: string;
                  title: string;
                  locationNames: string[];
                  startup?: { highConcept?: string; name: string };
                  jobUrl?: string;
                  createdAt?: string;
                  description?: string;
                }>;
              };
            };
          };

          const jobList = parsed?.props?.pageProps?.jobs ?? [];

          for (const job of jobList) {
            const company = job.startup?.name ?? 'Unknown';
            const locationText = job.locationNames?.join(', ') ?? '';

            jobs.push({
              externalId: `wellfound-${job.id}`,
              source: 'wellfound',
              title: job.title,
              company,
              location: locationText || `${this.locationToCity(location)}, Australia`,
              description: job.description ?? job.startup?.highConcept ?? '',
              url: job.jobUrl ?? `https://wellfound.com/jobs/${job.id}`,
              datePosted: job.createdAt ? new Date(job.createdAt) : undefined,
            });
          }

          logger.info(`[wellfound] ${role} in ${location}: ${jobList.length} jobs`);
        } else {
          // Fallback: try HTML scraping
          const cards = $('[class*="job"], article, li[class*="listing"]');
          logger.warn(`[wellfound] No __NEXT_DATA__ for ${role} — found ${cards.length} HTML cards`);

          cards.each((_, el) => {
            const titleEl = $(el).find('a[class*="title"], h2 a, h3 a').first();
            const title = titleEl.text().trim();
            const href = titleEl.attr('href') ?? '';
            const company = $(el).find('[class*="company"], [class*="startup"]').first().text().trim();
            const loc = $(el).find('[class*="location"]').first().text().trim();

            if (!title || !href) return;
            const absoluteUrl = href.startsWith('http') ? href : `https://wellfound.com${href}`;
            jobs.push({
              source: 'wellfound',
              title,
              company: company || 'Unknown',
              location: loc || `${this.locationToCity(location)}, Australia`,
              url: absoluteUrl,
            });
          });
        }

        await sleep(this.config.delayMs ?? 2_000);
      } catch (err) {
        logger.error(`[wellfound] Failed for ${role} in ${location}`, {
          error: String(err),
        });
      }
    }

    return jobs;
  }
}
