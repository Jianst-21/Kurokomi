import { describe, it, expect } from 'vitest';
import { ComicCardItem } from '@/lib/types';
import { deduplicateComics } from '@/lib/aggregator';

describe('Comprehensive Comic Deduplication Audit', () => {
  it('deduplicates titles with apostrophes and punctuation variations', () => {
    const items: ComicCardItem[] = [
      { id: 'komiku--1', title: "Omniscient Reader's Viewpoint", coverUrl: '1.jpg', type: 'manhwa' },
      { id: 'komikindo--1', title: "Omniscient Readers Viewpoint", coverUrl: '2.jpg', type: 'manhwa' },
      { id: 'softkomik--1', title: "Omniscient Reader’s Viewpoint Bahasa Indonesia", coverUrl: '3.jpg', type: 'manhwa' },
    ];

    const res = deduplicateComics(items);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('komiku--1');
  });

  it('deduplicates titles with brackets, prefixes, and suffixes like (End), [Tamat], Komik', () => {
    const items: ComicCardItem[] = [
      { id: 'komiku--archduke', title: "The Archduke's Gorgeous Wedding Was a Fraud", coverUrl: '1.jpg', type: 'manhwa' },
      { id: 'softkomik--archduke', title: "The Archduke's Gorgeous Wedding Was a Fraud [End]", coverUrl: '2.jpg', type: 'manhwa' },
      { id: 'komikindo--archduke', title: "Komik The Archduke's Gorgeous Wedding Was a Fraud", coverUrl: '3.jpg', type: 'manhwa' },
    ];

    const res = deduplicateComics(items);
    expect(res).toHaveLength(1);
  });

  it('deduplicates titles with multiple alternate titles across MangaDex and local providers', () => {
    const items: ComicCardItem[] = [
      // Provider 1 (Komiku): Korean Romaja
      { id: 'komiku--solo', title: 'Na Honjaman Level Up', coverUrl: '1.jpg', type: 'manhwa' },
      // Provider 2 (Komikindo): English title
      { id: 'komikindo--solo', title: 'Solo Leveling', coverUrl: '2.jpg', type: 'manhwa' },
      // Provider 3 (MangaDex): Contains both English title and Korean Romaja in altTitles
      {
        id: 'md-solo',
        title: 'Solo Leveling',
        altTitle: 'Na Honjaman Level Up',
        altTitles: ['Na Honjaman Level Up', 'I Alone Level Up', 'Only I Level Up'],
        coverUrl: '3.jpg',
        type: 'manhwa',
      },
    ];

    const res = deduplicateComics(items);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('komiku--solo');
  });

  it('deduplicates Frieren / Sousou no Frieren across providers', () => {
    const items: ComicCardItem[] = [
      { id: 'komiku--frieren', title: 'Sousou no Frieren', coverUrl: '1.jpg', type: 'manga' },
      { id: 'komikindo--frieren', title: "Frieren: Beyond Journey's End", coverUrl: '2.jpg', type: 'manga' },
      {
        id: 'md-frieren',
        title: "Frieren: Beyond Journey's End",
        altTitle: 'Sousou no Frieren',
        altTitles: ['Sousou no Frieren', 'Frieren at the Funeral'],
        coverUrl: '3.jpg',
        type: 'manga',
      },
    ];

    const res = deduplicateComics(items);
    expect(res).toHaveLength(1);
  });

  it('does NOT incorrectly merge distinct series that share similar words', () => {
    const items: ComicCardItem[] = [
      { id: 'komiku--naruto', title: 'Naruto', coverUrl: '1.jpg', type: 'manga' },
      { id: 'komiku--boruto', title: 'Boruto: Naruto Next Generations', coverUrl: '2.jpg', type: 'manga' },
      { id: 'komiku--solo', title: 'Solo Leveling', coverUrl: '3.jpg', type: 'manhwa' },
      { id: 'komiku--solo-ragnarok', title: 'Solo Leveling: Ragnarok', coverUrl: '4.jpg', type: 'manhwa' },
    ];

    const res = deduplicateComics(items);
    expect(res).toHaveLength(4);
  });
});
