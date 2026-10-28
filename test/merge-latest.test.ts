import { describe, it, expect } from 'vitest';
import { mergeLatestComics } from '../lib/aggregator';
import { ComicCardItem } from '../lib/types';

describe('mergeLatestComics', () => {
  it('deduplicates identical comics across providers, picking latest chapter and keeping source', () => {
    const komikindoItems: ComicCardItem[] = [
      {
        id: 'komikindo--eleceed',
        title: 'Eleceed',
        coverUrl: 'https://example.com/eleceed.jpg',
        type: 'manhwa',
        latestChapter: 'Ch. 423',
        updatedAt: '2 jam lalu',
        source: 'komikindo',
      },
    ];

    const komikuItems: ComicCardItem[] = [
      {
        id: 'komiku--eleceed',
        title: 'Eleceed Sub Indo',
        coverUrl: 'https://example.com/eleceed-komiku.jpg',
        type: 'manhwa',
        latestChapter: 'Chapter 424',
        updatedAt: '10 menit lalu',
        source: 'komiku',
      },
    ];

    const softkomikItems: ComicCardItem[] = [
      {
        id: 'softkomik--eleceed',
        title: 'Eleceed',
        coverUrl: 'https://example.com/eleceed-softkomik.jpg',
        type: 'manhwa',
        latestChapter: 'Ch. 423',
        updatedAt: '1 jam lalu',
        source: 'softkomik',
      },
    ];

    const merged = mergeLatestComics([komikindoItems, komikuItems, softkomikItems]);

    // Should only have 1 comic
    expect(merged.length).toBe(1);
    const comic = merged[0];
    expect(comic.title).toBe('Eleceed');
    // Latest chapter should be Ch. 424 from Komiku
    expect(comic.latestChapter).toMatch(/424/);
    expect(comic.source).toBe('komiku');
    expect(comic.updatedAt).toBe('10 menit lalu');
  });

  it('preserves user favorite ID if user previously favored from another provider', () => {
    const komikuItem: ComicCardItem = {
      id: 'komiku--heavenly-demon-cultivation-simulation',
      title: 'Heavenly Demon Cultivation Simulation',
      coverUrl: 'https://example.com/hd.jpg',
      type: 'manhwa',
      latestChapter: 'Ch. 203',
      updatedAt: '5 menit lalu',
      source: 'komiku',
    };

    const userFavs: ComicCardItem[] = [
      {
        id: 'softkomik--heavenly-demon-cultivation-simulation',
        title: 'Heavenly Demon Cultivation Simulation',
        coverUrl: 'https://example.com/hd-sk.jpg',
        type: 'manhwa',
        source: 'softkomik',
      },
    ];

    const merged = mergeLatestComics([[komikuItem]], userFavs);
    expect(merged.length).toBe(1);
    // Preserves favorite ID for seamless local storage favorites/history linking
    expect(merged[0].id).toBe('softkomik--heavenly-demon-cultivation-simulation');
    // But keeps source as komiku because Komiku is where the update happened
    expect(merged[0].source).toBe('komiku');
  });

  it('sorts all merged items descending chronologically', () => {
    const item1: ComicCardItem = {
      id: 'komikindo--a',
      title: 'Comic A',
      coverUrl: '',
      type: 'manhwa',
      updatedAt: '1 jam lalu',
      source: 'komikindo',
    };
    const item2: ComicCardItem = {
      id: 'komiku--b',
      title: 'Comic B',
      coverUrl: '',
      type: 'manhwa',
      updatedAt: '2 menit lalu',
      source: 'komiku',
    };
    const item3: ComicCardItem = {
      id: 'softkomik--c',
      title: 'Comic C',
      coverUrl: '',
      type: 'manhwa',
      updatedAt: '10 menit lalu',
      source: 'softkomik',
    };

    const merged = mergeLatestComics([[item1], [item2], [item3]]);
    expect(merged.map(c => c.title)).toEqual(['Comic B', 'Comic C', 'Comic A']);
  });
});
