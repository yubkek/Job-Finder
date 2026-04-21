// ─── Source identifiers ───────────────────────────────────────────────────────
export type JobSource =
  | 'adzuna'
  | 'jooble'
  | 'jora'
  | 'seek'
  | 'workforce-australia'
  | 'gradconnection'
  | 'prosple'
  | 'wellfound'
  | 'otta'
  | 'greenhouse';

// ─── Classification enums ─────────────────────────────────────────────────────
export type RoleType = 'SE' | 'DATA' | 'ML' | 'AI' | 'CLOUD' | 'OTHER';
export type LocationTag = 'SYDNEY' | 'MELBOURNE' | 'REMOTE';

export type LocationFilter = 'sydney' | 'melbourne' | 'all';

// ─── Raw job from scraper/API (pre-normalisation) ─────────────────────────────
export interface RawJob {
  externalId?: string;
  source: JobSource;
  title: string;
  company: string;
  location: string;
  description?: string;
  url: string;
  datePosted?: Date | string | null;
}

// ─── Normalised job (ready for DB insert) ─────────────────────────────────────
export interface NormalizedJob {
  externalId?: string;
  source: JobSource;
  title: string;
  company: string;
  location: string;
  description: string;
  summary?: string;
  url: string;
  urlHash: string;
  datePosted?: Date | null;
  roleTypes: RoleType[];
  locationTags: LocationTag[];
  isInternship: boolean;
  isGraduate: boolean;
}

// ─── API query filters ────────────────────────────────────────────────────────
export interface JobFilters {
  location?: LocationFilter;
  roleType?: RoleType | 'ALL';
  keyword?: string;
  isInternship?: boolean;
  isGraduate?: boolean;
  bookmarked?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'oldest';
}

// ─── API response ─────────────────────────────────────────────────────────────
export interface PaginatedJobs {
  jobs: JobRecord[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

// ─── DB record shape ──────────────────────────────────────────────────────────
export interface JobRecord {
  id: string;
  externalId: string | null;
  source: string;
  title: string;
  company: string;
  location: string;
  description: string | null;
  summary: string | null;
  url: string;
  urlHash: string;
  datePosted: Date | null;
  roleTypes: string[];
  locationTags: string[];
  isInternship: boolean;
  isGraduate: boolean;
  isBookmarked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Adapter contract ─────────────────────────────────────────────────────────
export interface AdapterConfig {
  locations: Array<'sydney' | 'melbourne'>;
  maxPages?: number;
  delayMs?: number;
}

export interface JobAdapter {
  fetchJobs(location: 'sydney' | 'melbourne'): Promise<RawJob[]>;
  fetchAllLocations(): Promise<RawJob[]>;
}

// ─── Scheduler result ─────────────────────────────────────────────────────────
export interface ScraperResult {
  source: JobSource;
  jobsFound: number;
  jobsAdded: number;
  errors: string[];
  durationMs: number;
}
