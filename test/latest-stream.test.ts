import { describe, it, expect, vi } from 'vitest';
import { fetchLatestComicsByType } from '../lib/mangadex';

describe('fetchLatestComicsByType Multi-Source Stream', () => {
  it('fetches and merges updates concurrently across providers in Node/server environment', async () => {
    const results = await fetchLatestComicsByType('manhwa', 10, 0);
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    // When results are returned, they should have source attribution
    if (results.length > 0) {
      expect(results[0].source).toBeDefined();
    }
  });
});
