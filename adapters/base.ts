import type { AdapterConfig, JobAdapter, RawJob } from '@/types';

/**
 * Abstract base class for all job source adapters.
 * Each adapter must implement `fetchJobs(location)`.
 */
export abstract class BaseAdapter implements JobAdapter {
  protected config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  abstract fetchJobs(location: 'sydney' | 'melbourne'): Promise<RawJob[]>;

  /** Fetch for all configured locations and merge results */
  async fetchAllLocations(): Promise<RawJob[]> {
    const allJobs: RawJob[] = [];

    for (const location of this.config.locations) {
      const jobs = await this.fetchJobs(location);
      allJobs.push(...jobs);
    }

    return allJobs;
  }

  /** Map location string to Adzuna/Jooble-friendly city name */
  protected locationToCity(location: 'sydney' | 'melbourne'): string {
    return location === 'sydney' ? 'Sydney' : 'Melbourne';
  }
}
