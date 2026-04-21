import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { logger } from './logger';

// ─── Realistic browser-like headers to reduce bot detection ──────────────────
const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-AU,en-GB;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  Connection: 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Ch-Ua': '"Google Chrome";v="135", "Chromium";v="135", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
};

// ─── Shared Axios instance ────────────────────────────────────────────────────
export const httpClient: AxiosInstance = axios.create({
  timeout: 20_000,
  headers: DEFAULT_HEADERS,
});

/** Sleep for `ms` milliseconds */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch a URL with exponential-backoff retry logic.
 * Respects rate limits by sleeping between retries.
 */
export async function fetchWithRetry<T = unknown>(
  url: string,
  config: AxiosRequestConfig = {},
  retries = 3,
  delayMs = 1_500,
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await httpClient.get<T>(url, config);
      return response.data;
    } catch (err: unknown) {
      const isLast = attempt === retries;
      const status =
        axios.isAxiosError(err) ? err.response?.status : undefined;

      logger.warn(`[http] Attempt ${attempt}/${retries} failed for ${url}`, {
        status,
        error: axios.isAxiosError(err) ? err.message : String(err),
      });

      // Don't retry on 403/404 — the resource is explicitly unavailable
      if (status === 403 || status === 404 || isLast) throw err;

      await sleep(delayMs * attempt); // exponential backoff
    }
  }
  throw new Error(`fetchWithRetry exhausted for ${url}`);
}

/**
 * POST helper with retry (used by Jooble API etc.)
 */
export async function postWithRetry<T = unknown>(
  url: string,
  data: unknown,
  config: AxiosRequestConfig = {},
  retries = 3,
  delayMs = 1_500,
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await httpClient.post<T>(url, data, config);
      return response.data;
    } catch (err: unknown) {
      const isLast = attempt === retries;
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      logger.warn(`[http] POST attempt ${attempt}/${retries} failed for ${url}`, {
        status,
      });
      if (status === 403 || status === 404 || isLast) throw err;
      await sleep(delayMs * attempt);
    }
  }
  throw new Error(`postWithRetry exhausted for ${url}`);
}
