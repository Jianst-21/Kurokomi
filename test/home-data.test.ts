import { describe, it, expect } from 'vitest';
import { buildSearchQueryUrl } from '@/lib/mangadex';

describe('Home Data Queries', () => {
  it('builds query with order[latestUploadedChapter]=desc for latest updates', () => {
    const url = buildSearchQueryUrl({
      type: 'manhwa',
      limit: 10,
      offset: 0,
      order: { latestUploadedChapter: 'desc' },
    });
    expect(url).toContain('order%5BlatestUploadedChapter%5D=desc');
    expect(url).toContain('originalLanguage%5B%5D=ko');
    expect(url).toContain('limit=10');
  });

  it('builds query with order[followedCount]=desc for top recommendations', () => {
    const url = buildSearchQueryUrl({
      type: 'manga',
      limit: 15,
      offset: 0,
      order: { followedCount: 'desc' },
    });
    expect(url).toContain('order%5BfollowedCount%5D=desc');
    expect(url).toContain('originalLanguage%5B%5D=ja');
    expect(url).toContain('limit=15');
  });
});
