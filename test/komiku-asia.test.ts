import { describe, it, expect } from 'vitest';
import {
  parseKomikuAsiaComicList,
  parseKomikuAsiaDetail,
  parseKomikuAsiaChapters,
  parseKomikuAsiaPages,
  KOMIKU_ASIA_API,
} from '@/lib/komiku';

describe('Komiku Asia API Parsers', () => {
  it('parses comic list items correctly', () => {
    const rawItems = [
      {
        id: 301732,
        slug: 'the-regressed-son-of-a-duke-is-an-assassin',
        title: 'The Regressed Son Of A Duke Is An Assassin',
        type: 'Manhwa',
        genres: ['Action', 'Drama', 'Fantasy'],
        status: 'Ongoing',
        chapterCount: 151,
        latestChapter: 151,
        latestChapterAt: 1793565622000,
        coverUrl: 'https://content.komiku.me/wp-content/uploads/cover.jpg',
      },
    ];

    const cards = parseKomikuAsiaComicList(rawItems);
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe('komiku--the-regressed-son-of-a-duke-is-an-assassin');
    expect(cards[0].title).toBe('The Regressed Son Of A Duke Is An Assassin');
    expect(cards[0].type).toBe('manhwa');
    expect(cards[0].latestChapter).toBe('Chapter 151');
    expect(cards[0].source).toBe('komiku');
  });

  it('parses detail and altTitles correctly', () => {
    const rawDetail = {
      id: 100828,
      slug: '060624-solo-leveling',
      title: 'Solo Leveling',
      alt: 'Na Honjaman Level Up',
      type: 'Manhwa',
      genres: ['Action', 'Adventure'],
      status: 'Completed',
      author: 'Chugong',
      desc: 'Dunia berburu monster.',
      coverUrl: 'https://content.komiku.me/cover.jpg',
    };

    const detail = parseKomikuAsiaDetail(rawDetail);
    expect(detail).not.toBeNull();
    expect(detail?.id).toBe('komiku--060624-solo-leveling');
    expect(detail?.title).toBe('Solo Leveling');
    expect(detail?.altTitles).toContain('Na Honjaman Level Up');
    expect(detail?.status).toBe('completed');
    expect(detail?.type).toBe('manhwa');
    expect(detail?.author).toBe('Chugong');
  });

  it('parses chapters list and maps id cleanly', () => {
    const rawChapters = [
      {
        id: 143501,
        n: 179.6,
        title: 'Chapter 179.6',
        releasedLabel: '25 Jul 2022',
        releasedAt: 1658752916000,
      },
      {
        id: 100872,
        n: 1,
        title: 'Chapter 1',
        releasedLabel: '16 Feb 2022',
        releasedAt: 1644979947000,
      },
    ];

    const chapters = parseKomikuAsiaChapters('060624-solo-leveling', 100828, rawChapters);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].id).toBe('komiku--060624-solo-leveling--143501');
    expect(chapters[0].chapter).toBe('179.6');
    expect(chapters[0].title).toBe('Chapter 179.6');
    expect(chapters[1].id).toBe('komiku--060624-solo-leveling--100872');
    expect(chapters[1].chapter).toBe('1');
  });

  it('parses chapter image pages properly', () => {
    const rawPages = [
      {
        index: 0,
        url: 'https://cdnkomiku.xyz/wp-content/chapter-1/01.jpg',
      },
      {
        index: 1,
        url: 'https://cdnkomiku.xyz/wp-content/chapter-1/02.jpg',
      },
    ];

    const pages = parseKomikuAsiaPages(rawPages);
    expect(pages).toHaveLength(2);
    expect(pages[0].url).toBe('https://cdnkomiku.xyz/wp-content/chapter-1/01.jpg');
    expect(pages[0].fallbackUrl).toContain('image-proxy');
  });
});
