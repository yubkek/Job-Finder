import { createHash } from 'crypto';
import { load } from 'cheerio';
import type { NormalizedJob, RawJob, RoleType, LocationTag } from '@/types';

// ─── Role type keyword maps ───────────────────────────────────────────────────
const ROLE_KEYWORDS: Record<RoleType, string[]> = {
  SE: [
    'software engineer', 'software developer', 'frontend', 'back-end', 'backend',
    'full stack', 'fullstack', 'web developer', 'mobile developer', 'ios', 'android',
    'java developer', 'python developer', 'node', 'react developer', 'platform engineer',
    'devops', 'site reliability', 'sre', 'systems engineer',
  ],
  DATA: [
    'data analyst', 'data engineer', 'data scientist', 'analytics', 'business intelligence',
    'bi developer', 'sql', 'tableau', 'power bi', 'looker', 'data warehouse', 'etl',
    'data insights', 'quantitative analyst',
  ],
  ML: [
    'machine learning', 'ml engineer', 'deep learning', 'neural network', 'pytorch',
    'tensorflow', 'scikit', 'nlp', 'computer vision', 'llm', 'generative ai',
    'model training', 'mlops',
  ],
  AI: [
    'artificial intelligence', 'ai engineer', 'ai researcher', 'ai developer',
    'prompt engineer', 'ai product', 'large language model',
  ],
  CLOUD: [
    'cloud engineer', 'aws', 'azure', 'gcp', 'infrastructure', 'devops', 'kubernetes',
    'terraform', 'ci/cd', 'platform engineer', 'devsecops', 'cloud architect',
  ],
  OTHER: [],
};

// Jobs mentioning these → treat as explicitly low experience (good)
const LOW_EXPERIENCE_KEYWORDS = [
  '0-1 year', '0 - 1 year', '0-2 year', '0 - 2 year',
  '1+ year', '1-2 year', '1 to 2 year',
  '2+ year', '2-3 year', '2 years experience', '1 year experience',
  'no experience required', 'no experience needed', 'no prior experience',
  'without experience', 'less than 2 years',
];

// Jobs mentioning these → senior/mid-level, exclude unless also intern/grad flagged
const SENIORITY_EXCLUSIONS = [
  'senior ', 'sr.', ' sr ', 'lead developer', 'lead engineer', 'lead data',
  'tech lead', 'team lead', 'engineering lead', 'principal ', 'staff engineer',
  'staff developer', 'engineering manager', 'product manager', 'project manager',
  'director', 'head of engineering', 'head of technology', 'head of data',
  'head of product', 'vp of', 'vice president', 'chief ', 'cto', 'cio', 'cpo',
  '3+ years', '4+ years', '5+ years', '6+ years', '7+ years', '8+ years',
  '9+ years', '10+ years', '3 years experience', '4 years experience',
  '5 years experience', 'minimum 3 years', 'minimum of 3', 'at least 3 years',
  'minimum 4 years', 'at least 4 years', 'minimum 5 years', 'at least 5 years',
  'minimum 3+ years', 'minimum 4+ years',
];

const INTERNSHIP_KEYWORDS = [
  'intern', 'internship', 'placement', 'work experience', 'co-op',
  'vacation scholar', 'cadet', 'trainee', 'apprentice', 'summer program',
];

const GRADUATE_KEYWORDS = [
  'graduate', 'grad role', 'junior', 'entry level', 'entry-level',
  'new grad', 'early career', 'associate', 'recent graduate',
  'technology graduate', 'engineering graduate', 'software graduate',
  'data graduate', '0-2 years', '0 - 2 years', 'no experience required',
  'fresh graduate', 'campus hire', 'vacation scholarship',
];

// ─── Location keyword maps ────────────────────────────────────────────────────
const LOCATION_KEYWORDS: Record<LocationTag, string[]> = {
  SYDNEY: ['sydney', 'nsw', 'new south wales', 'parramatta', 'north sydney', 'chatswood', 'macquarie park'],
  MELBOURNE: ['melbourne', 'vic', 'victoria', 'st kilda', 'south yarra', 'docklands', 'richmond', 'southbank'],
  REMOTE: ['remote', 'work from home', 'wfh', 'distributed', 'anywhere in australia'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip HTML tags and normalise whitespace */
function cleanHtml(html: string): string {
  const $ = load(html);
  return $.root().text().replace(/\s+/g, ' ').trim();
}

/** SHA-256 hash of the canonical URL for deduplication */
function hashUrl(url: string): string {
  // Normalise: lowercase, remove trailing slash and common tracking params
  const normalized = url
    .toLowerCase()
    .replace(/\/+$/, '')
    .replace(/[?&](utm_\w+|ref|source|medium|campaign)=[^&]*/g, '')
    .replace(/[?&]+$/, '');
  return createHash('sha256').update(normalized).digest('hex');
}

/** Check if text contains any of the keywords (case-insensitive) */
function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

/** Detect role types from title + description */
function detectRoleTypes(title: string, description: string): RoleType[] {
  const haystack = `${title} ${description}`.toLowerCase();
  const types: RoleType[] = [];

  for (const [role, keywords] of Object.entries(ROLE_KEYWORDS) as [RoleType, string[]][]) {
    if (role === 'OTHER') continue;
    if (containsAny(haystack, keywords)) types.push(role);
  }

  return types.length > 0 ? types : ['OTHER'];
}

/** Detect location tags from the location string */
function detectLocationTags(location: string, description = ''): LocationTag[] {
  // Check both the location field and description (some jobs say "based in Sydney" in body)
  const haystack = `${location} ${description}`.toLowerCase();
  const tags: LocationTag[] = [];
  for (const [tag, keywords] of Object.entries(LOCATION_KEYWORDS) as [LocationTag, string[]][]) {
    if (containsAny(haystack, keywords)) tags.push(tag);
  }
  return tags;
}

/** Parse a loosely-formatted date string into a Date object */
function parseDate(raw: Date | string | null | undefined): Date | null {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// ─── Main normaliser ──────────────────────────────────────────────────────────

export function normalizeJob(raw: RawJob): NormalizedJob {
  const description = raw.description
    ? cleanHtml(raw.description).slice(0, 10_000) // cap at 10k chars
    : '';

  const title = raw.title.trim();
  const company = raw.company.trim();
  const location = raw.location.trim();

  const haystack = `${title} ${description}`;

  return {
    externalId: raw.externalId,
    source: raw.source,
    title,
    company,
    location,
    description,
    url: raw.url.trim(),
    urlHash: hashUrl(raw.url),
    datePosted: parseDate(raw.datePosted),
    roleTypes: detectRoleTypes(title, description),
    locationTags: detectLocationTags(location, description),
    isInternship: containsAny(haystack, INTERNSHIP_KEYWORDS),
    isGraduate: containsAny(haystack, GRADUATE_KEYWORDS),
  };
}

/**
 * Returns true only if the job is:
 * 1. In a recognised tech role (not OTHER), AND
 * 2. An internship OR a graduate/junior/entry-level role
 *
 * This keeps unrelated jobs (sales, marketing, trades, etc.) out of the DB.
 */
function isRelevant(job: NormalizedJob): boolean {
  // Must be in Sydney, Melbourne, or Remote-AU — drop jobs from other cities/countries
  const hasAULocation = job.locationTags.length > 0;
  if (!hasAULocation) return false;

  // Must be a recognised tech discipline
  const isTechRole = !(job.roleTypes.length === 1 && job.roleTypes[0] === 'OTHER');
  if (!isTechRole) return false;

  // Explicitly labelled intern/grad — always include
  if (job.isInternship || job.isGraduate) return true;

  const haystack = `${job.title} ${job.description}`.toLowerCase();

  // Explicitly mentions low experience requirement — include
  if (containsAny(haystack, LOW_EXPERIENCE_KEYWORDS)) return true;

  // Explicitly senior/mid-level — exclude
  if (containsAny(haystack, SENIORITY_EXCLUSIONS)) return false;

  // No experience level specified at all → assume open to juniors, include
  return true;
}

export function normalizeJobs(raws: RawJob[]): NormalizedJob[] {
  return raws.map(normalizeJob).filter(isRelevant);
}
