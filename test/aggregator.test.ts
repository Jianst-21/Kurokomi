import { describe, it, expect } from 'vitest';
import { mergeAndSortChapters, deduplicateComics } from '@/lib/aggregator';
import { ChapterItem, ComicCardItem } from '@/lib/types';

describe('Aggregator - Chapter Merging & Comic Deduplication', () => {
  it('merges chapters from multiple providers, picking the one with the newest update / preferred provider', () => {
    const komikuChaps: ChapterItem[] = [
      { id: 'komiku--ch-180', chapter: '180', title: 'Ch 180', scanlationGroup: 'Komiku Sub Indo', publishAt: '2026-10-20', pagesCount: 0 },
      { id: 'komiku--ch-179', chapter: '179', title: 'Ch 179', scanlationGroup: 'Komiku Sub Indo', publishAt: '2026-10-10', pagesCount: 0 },
    ];

    const komikindoChaps: ChapterItem[] = [
      // Komikindo has Chapter 181 which Komiku doesn't have yet!
      { id: 'komikindo--ch-181', chapter: '181', title: 'Ch 181', scanlationGroup: 'Komikindo Sub Indo', publishAt: '2026-10-25', pagesCount: 0 },
      // Komikindo also has Chapter 180, but published earlier
      { id: 'komikindo--ch-180', chapter: '180', title: 'Ch 180', scanlationGroup: 'Komikindo Sub Indo', publishAt: '2026-10-18', pagesCount: 0 },
    ];

    const merged = mergeAndSortChapters(komikuChaps, komikindoChaps);

    expect(merged).toHaveLength(3);
    // Highest/newest chapter 181 must be at the top!
    expect(merged[0].chapter).toBe('181');
    expect(merged[0].id).toBe('komikindo--ch-181');

    // Chapter 180 should be picked from Komiku (newer publish date 2026-10-20 vs 2026-10-18)
    expect(merged[1].chapter).toBe('180');
    expect(merged[1].id).toBe('komiku--ch-180');

    // Chapter 179
    expect(merged[2].chapter).toBe('179');
    expect(merged[2].id).toBe('komiku--ch-179');
  });

  it('deduplicates comics preferring Komiku first, then Komikindo, then MangaDex', () => {
    const cards: ComicCardItem[] = [
      { id: 'komikindo--solo-leveling', title: 'Solo Leveling', coverUrl: 'http://img1.jpg', type: 'manhwa' },
      { id: 'komiku--solo-leveling-id', title: 'Solo Leveling', coverUrl: 'http://img2.jpg', type: 'manhwa' },
      { id: 'md-uuid-1234', title: 'Solo Leveling', coverUrl: 'http://img3.jpg', type: 'manhwa' },
      { id: 'komikindo--eleceed', title: 'Eleceed', coverUrl: 'http://img4.jpg', type: 'manhwa' },
    ];

    const deduplicated = deduplicateComics(cards);
    expect(deduplicated).toHaveLength(2);

    // For Solo Leveling, Komiku must be kept
    const solo = deduplicated.find(c => c.title === 'Solo Leveling');
    expect(solo?.id).toBe('komiku--solo-leveling-id');

    // Eleceed was only on Komikindo
    const eleceed = deduplicated.find(c => c.title === 'Eleceed');
    expect(eleceed?.id).toBe('komikindo--eleceed');
  });

  it('unifies comics that have different titles across providers when matched by altTitle', () => {
    const cards: ComicCardItem[] = [
      // Provider A (Komiku) uses English/Popular title
      {
        id: 'komiku--alchemist',
        title: "The Evil Alchemist Can't Handle His Own Experiment",
        coverUrl: 'http://img-k.jpg',
        type: 'manhua',
      },
      // Provider B (MangaDex) has Romanized pinyin title as altTitle
      {
        id: 'md-uuid-alchemist',
        title: "The Evil Alchemist Can't Handle His Own Experiment",
        altTitle: "Xié'è Liànjīn Shùshì Gǎo Bùdìng Zìjǐ De Shíyàn Tǐ",
        coverUrl: 'http://img-md.jpg',
        type: 'manhua',
      },
      // Provider C (Komikindo) uses Pinyin title directly without altTitle
      {
        id: 'komikindo--xie-e-lianjin',
        title: "Xié'è Liànjīn Shùshì Gǎo Bùdìng Zìjǐ De Shíyàn Tǐ",
        coverUrl: 'http://img-ki.jpg',
        type: 'manhua',
      },
    ];

    const deduplicated = deduplicateComics(cards);
    // All 3 should be merged into 1 card!
    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].id).toBe('komiku--alchemist'); // Komiku has highest provider priority
    expect(deduplicated[0].title).toBe("The Evil Alchemist Can't Handle His Own Experiment");
    expect(deduplicated[0].altTitle).toBe("Xié'è Liànjīn Shùshì Gǎo Bùdìng Zìjǐ De Shíyàn Tǐ");
  });

  it('transitively deduplicates Rent-a-Girlfriend across different aliases regardless of arrival order', () => {
    const cards: ComicCardItem[] = [
      {
        id: 'komiku--kanojo-okarishimasu',
        title: 'Kanojo Okarishimasu',
        coverUrl: 'http://img1.jpg',
        type: 'manga',
      },
      {
        id: 'komikindo--rent-a-girlfriend',
        title: 'Rent a Girlfriend',
        coverUrl: 'http://img2.jpg',
        type: 'manga',
      },
      {
        id: 'softkomik--kanojo-okarishimasu-kanokari',
        title: 'Kanojo, Okarishimasu (Kanokari)',
        coverUrl: 'http://img-soft.jpg',
        type: 'manga',
      },
      {
        id: 'md-rent-a-girlfriend',
        title: 'Rent-A-Girlfriend',
        altTitle: 'Kanojo, Okarishimasu',
        coverUrl: 'http://img3.jpg',
        type: 'manga',
      },
    ];

    const deduplicated = deduplicateComics(cards);
    // All 4 source entries must be transitively clustered into exactly 1 comic!
    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].id).toBe('komiku--kanojo-okarishimasu');
    expect(deduplicated[0].title.toLowerCase()).toContain('rent');
    expect(deduplicated[0].altTitle?.toLowerCase()).toContain('kanojo');
  });
});
