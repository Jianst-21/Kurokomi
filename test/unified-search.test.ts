import { describe, it, expect, vi } from 'vitest';
import { searchComicsUnified } from '@/lib/aggregator';
import * as komikuModule from '@/lib/komiku';
import * as komikindoModule from '@/lib/komikindo';
import * as softkomikModule from '@/lib/softkomik';
import * as mangadexModule from '@/lib/mangadex';
import { ComicCardItem } from '@/lib/types';

describe('searchComicsUnified', () => {
  it('queries all providers and prioritizes Komiku over Komikindo and MangaDex', async () => {
    vi.spyOn(komikuModule, 'searchKomiku').mockResolvedValue([
      { id: 'komiku--solo-leveling-id', title: 'Solo Leveling', coverUrl: 'k-img.jpg', type: 'manhwa' },
    ]);

    vi.spyOn(komikindoModule, 'searchKomikindo').mockResolvedValue([
      { id: 'komikindo--solo-leveling', title: 'Solo Leveling', coverUrl: 'ki-img.jpg', type: 'manhwa' },
      { id: 'komikindo--eleceed', title: 'Eleceed', coverUrl: 'ele-img.jpg', type: 'manhwa' },
    ]);

    vi.spyOn(softkomikModule, 'searchSoftkomik').mockResolvedValue([]);

    vi.spyOn(mangadexModule, 'searchComics').mockResolvedValue([
      { id: 'md-solo', title: 'Solo Leveling', coverUrl: 'md-img.jpg', type: 'manhwa' },
      { id: 'md-naruto', title: 'Naruto', coverUrl: 'naruto-img.jpg', type: 'manga' },
    ]);

    const results = await searchComicsUnified('Solo');

    // Should have Solo Leveling (from Komiku), Eleceed (from Komikindo), and Naruto (from MangaDex)
    expect(results).toHaveLength(3);

    const solo = results.find(r => r.title === 'Solo Leveling');
    expect(solo?.id).toBe('komiku--solo-leveling-id');

    const eleceed = results.find(r => r.title === 'Eleceed');
    expect(eleceed?.id).toBe('komikindo--eleceed');

    const naruto = results.find(r => r.title === 'Naruto');
    expect(naruto?.id).toBe('md-naruto');
  });

  it('respects comic type filtering when searching', async () => {
    vi.spyOn(softkomikModule, 'searchSoftkomik').mockResolvedValue([]);
    const results = await searchComicsUnified('Solo', { type: 'manhwa' });
    expect(results.every(r => r.type === 'manhwa')).toBe(true);
  });
});
