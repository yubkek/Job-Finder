/**
 * Central adapter registry.
 * Import and instantiate all 10 source adapters here.
 */

import type { AdapterConfig, JobAdapter, JobSource } from '@/types';
import { AdzunaAdapter } from './adzuna';
import { GradConnectionAdapter } from './gradconnection';
import { GreenhouseAdapter } from './greenhouse';
import { JoobleAdapter } from './jooble';
import { JoraAdapter } from './jora';
import { OttaAdapter } from './otta';
import { ProspleAdapter } from './prosple';
import { SeekAdapter } from './seek';
import { WellfoundAdapter } from './wellfound';
import { WorkforceAustraliaAdapter } from './workforce-australia';

export const DEFAULT_CONFIG: AdapterConfig = {
  locations: ['sydney', 'melbourne'],
  maxPages: 3,
  delayMs: 1_500,
};

export function createAllAdapters(
  config: AdapterConfig = DEFAULT_CONFIG,
): Array<{ source: JobSource; adapter: JobAdapter }> {
  return [
    { source: 'adzuna', adapter: new AdzunaAdapter(config) },
    { source: 'jooble', adapter: new JoobleAdapter(config) },
    { source: 'jora', adapter: new JoraAdapter(config) },
    { source: 'seek', adapter: new SeekAdapter(config) },
    { source: 'workforce-australia', adapter: new WorkforceAustraliaAdapter(config) },
    { source: 'gradconnection', adapter: new GradConnectionAdapter(config) },
    { source: 'prosple', adapter: new ProspleAdapter(config) },
    { source: 'wellfound', adapter: new WellfoundAdapter(config) },
    { source: 'otta', adapter: new OttaAdapter(config) },
    { source: 'greenhouse', adapter: new GreenhouseAdapter(config) },
  ];
}

export {
  AdzunaAdapter,
  GradConnectionAdapter,
  GreenhouseAdapter,
  JoobleAdapter,
  JoraAdapter,
  OttaAdapter,
  ProspleAdapter,
  SeekAdapter,
  WellfoundAdapter,
  WorkforceAustraliaAdapter,
};
