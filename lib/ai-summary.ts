import OpenAI from 'openai';
import { sleep } from './http-client';
import { logger } from './logger';
import type { NormalizedJob } from '@/types';

let openai: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openai;
}

const SYSTEM_PROMPT = `You are a concise job description summariser for Australian tech job seekers.
Write exactly 2-4 sentences summarising the role. Cover:
1. What the company does (briefly)
2. What the candidate will do / key responsibilities
3. What the ideal candidate looks like / key requirements

Be factual, concise, and targeted at students and recent graduates. No fluff.`;

/**
 * Generate an AI summary for a single job description.
 * Returns null if the OpenAI key is not set or an error occurs.
 */
export async function generateSummary(
  title: string,
  company: string,
  description: string,
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  // Truncate to keep token cost low
  const truncated = description.slice(0, 3_000);

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Job Title: ${title}\nCompany: ${company}\n\nDescription:\n${truncated}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.4,
    });

    return completion.choices[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    logger.warn('[ai-summary] Failed to generate summary', { error: String(err) });
    return null;
  }
}

/**
 * Batch-generate summaries for a list of jobs.
 * Adds a short delay between calls to respect rate limits.
 */
export async function generateSummaries(
  jobs: NormalizedJob[],
  delayMs = 500,
): Promise<NormalizedJob[]> {
  if (!getClient()) {
    logger.info('[ai-summary] OPENAI_API_KEY not set — skipping summaries');
    return jobs;
  }

  const results: NormalizedJob[] = [];

  for (const job of jobs) {
    if (job.summary) {
      results.push(job);
      continue;
    }

    const summary = await generateSummary(
      job.title,
      job.company,
      job.description,
    );

    results.push({ ...job, summary: summary ?? undefined });
    await sleep(delayMs);
  }

  return results;
}
