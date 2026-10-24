import { describe, it, expect, vi } from 'vitest';
import {
  deduplicateChapters,
  sortChapters,
  getComicTypeFromLanguage,
  buildSearchQueryUrl,
  searchComics,
} from '@/lib/mangadex';
import { ChapterItem } from '@/lib/types';

describe('MangaDex Helpers & Utilities', () => {
  it('correctly maps originalLanguage to ComicType', () => {
    expect(getComicTypeFromLanguage('ja')).toBe('manga');
    expect(getComicTypeFromLanguage('ko')).toBe('manhwa');
    expect(getComicTypeFromLanguage('zh')).toBe('manhua');
    expect(getComicTypeFromLanguage('zh-hk')).toBe('manhua');
    expect(getComicTypeFromLanguage('en')).toBe('other');
  });

  it('deduplicates multiple scanlation releases for the same chapter number', () => {
    const chapters: ChapterItem[] = [
      {
        id: 'c1-group-b',
        chapter: '1',
        title: 'Bab 1',
        scanlationGroup: 'Group B',
        publishAt: '2023-01-02T00:00:00Z',
        pagesCount: 20,
      },
      {
        id: 'c1-group-a',
        chapter: '1',
        title: 'Bab 1',
        scanlationGroup: 'Group A',
        publishAt: '2023-01-01T00:00:00Z',
        pagesCount: 20,
      },
      {
        id: 'c2',
        chapter: '2',
        title: 'Bab 2',
        publishAt: '2023-01-03T00:00:00Z',
        pagesCount: 22,
      },
    ];

    const deduplicated = deduplicateChapters(chapters);
    expect(deduplicated.length).toBe(2);
    expect(deduplicated.map(c => c.chapter)).toEqual(['1', '2']);
    expect(deduplicated[0].id).toBe('c1-group-b');
  });

  it('sorts chapters correctly with fractional chapters like 10.5', () => {
    const chapters: ChapterItem[] = [
      { id: '11', chapter: '11', publishAt: '2023-01-01', pagesCount: 20 },
      { id: '10', chapter: '10', publishAt: '2023-01-01', pagesCount: 20 },
      { id: '10.5', chapter: '10.5', publishAt: '2023-01-01', pagesCount: 20 },
      { id: '1', chapter: '1', publishAt: '2023-01-01', pagesCount: 20 },
    ];

    const asc = sortChapters(chapters, true);
    expect(asc.map(c => c.chapter)).toEqual(['1', '10', '10.5', '11']);

    const desc = sortChapters(chapters, false);
    expect(desc.map(c => c.chapter)).toEqual(['11', '10.5', '10', '1']);
  });

  it('builds search URL containing Indonesian language filter and full color tag', () => {
    const url = buildSearchQueryUrl({
      query: 'Solo Leveling',
      type: 'manhwa',
      isColor: true,
      genre: 'action',
    });

    expect(url).toContain('api.mangadex.org/manga');
    expect(url).toContain('availableTranslatedLanguage%5B%5D=id');
    expect(url).toContain('originalLanguage%5B%5D=ko');
    expect(url).toContain('f4122d1c-3b44-44d0-9936-ff7502c39ad3');
  });

  it('throws descriptive error on 429 rate limit or HTTP failure in searchComics', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    });

    await expect(searchComics('test')).rejects.toThrow(/429|Batas akses/i);

    global.fetch = originalFetch;
  });
});
