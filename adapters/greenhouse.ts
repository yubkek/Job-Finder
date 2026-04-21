import { load } from 'cheerio';
import { fetchWithRetry, sleep } from '@/lib/http-client';
import { logger } from '@/lib/logger';
import type { AdapterConfig, RawJob } from '@/types';
import { BaseAdapter } from './base';

// ─── Greenhouse public API types ──────────────────────────────────────────────
interface GreenhouseJob {
  id: number;
  title: string;
  location: { name: string };
  content: string; // HTML job description
  updated_at: string;
  absolute_url: string;
  departments?: Array<{ name: string }>;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
  meta?: { total: number };
}

/**
 * Australian tech companies that use Greenhouse-hosted job boards.
 * Add or remove companies as needed.
 * The slug is the identifier in the Greenhouse URL:
 *   https://boards.greenhouse.io/{slug}
 */
const GREENHOUSE_COMPANIES: Array<{ slug: string; name: string }> = [
  { slug: 'canva', name: 'Canva' },
  { slug: 'cultureamp', name: 'Culture Amp' },
  { slug: 'airwallex', name: 'Airwallex' },
  { slug: 'deputy', name: 'Deputy' },
  { slug: 'siteminder', name: 'SiteMinder' },
  { slug: 'brighte', name: 'Brighte' },
  { slug: 'immutable', name: 'Immutable' },
  { slug: 'safety-culture', name: 'SafetyCulture' },
  { slug: 'pax8', name: 'Pax8' },
  { slug: 'atlassian', name: 'Atlassian' },
  { slug: 'envato', name: 'Envato' },
  { slug: 'pexa', name: 'PEXA' },
  { slug: 'afterpaytouch', name: 'Afterpay' },
  { slug: 'tyro', name: 'Tyro' },
  { slug: 'airtasker', name: 'Airtasker' },
];

// Keywords that indicate entry-level / intern / grad roles
const RELEVANT_KEYWORDS = [
  'intern', 'internship', 'graduate', 'grad', 'junior', 'entry',
  'associate', 'early career', 'new grad', 'placement',
];

// Australian city / state keywords for location filtering
const AU_LOCATION_KEYWORDS = [
  'australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'nsw', 'vic',
  'remote', // include remote roles too
];

function isRelevantTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return RELEVANT_KEYWORDS.some((kw) => lower.includes(kw));
}

function isAustralianLocation(location: string): boolean {
  const lower = location.toLowerCase();
  return AU_LOCATION_KEYWORDS.some((kw) => lower.includes(kw));
}

function matchesLocationFilter(
  location: string,
  target: 'sydney' | 'melbourne',
): boolean {
  const lower = location.toLowerCase();
  if (lower.includes('remote') || lower.includes('australia')) return true;
  return lower.includes(target);
}

export class GreenhouseAdapter extends BaseAdapter {
  constructor(config: AdapterConfig) {
    super(config);
  }

  /**
   * Greenhouse API is global — we fetch all jobs per company and filter
   * by location in post-processing.
   */
  async fetchJobs(location: 'sydney' | 'melbourne'): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    for (const company of GREENHOUSE_COMPANIES) {
      try {
        const url = `https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs`;
        const data = await fetchWithRetry<GreenhouseResponse>(url, {
          params: { content: true },
          headers: {
            Accept: 'application/json',
            Referer: `https://boards.greenhouse.io/${company.slug}`,
          },
        });

        const allJobs = data.jobs ?? [];
        let added = 0;

        for (const job of allJobs) {
          const locationName = job.location?.name ?? '';

          // Filter: must be Australian and match location filter
          if (!isAustralianLocation(locationName)) continue;
          if (!matchesLocationFilter(locationName, location)) continue;

          // Filter: must be entry-level/grad/intern
          if (!isRelevantTitle(job.title)) continue;

          // Clean HTML description
          const $ = load(job.content ?? '');
          const description = $.root().text().replace(/\s+/g, ' ').trim();

          jobs.push({
            externalId: `greenhouse-${job.id}`,
            source: 'greenhouse',
            title: job.title,
            company: company.name,
            location: locationName,
            description,
            url: job.absolute_url,
            datePosted: new Date(job.updated_at),
          });

          added++;
        }

        logger.info(
          `[greenhouse] ${company.name}: ${allJobs.length} total, ${added} matching in ${location}`,
        );
        await sleep(this.config.delayMs ?? 800);
      } catch (err) {
        logger.error(`[greenhouse] Failed for ${company.name}`, {
          error: String(err),
        });
      }
    }

    return jobs;
  }
}
