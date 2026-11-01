import { describe, it, expect } from 'vitest';
import { parseKomikuChapters } from '@/lib/komiku';
import { parseKomikindoChapters } from '@/lib/komikindo';
import { parseMangaPillChaptersHtml } from '@/lib/mangapill';
import { sortChapters } from '@/lib/mangadex';
import {
  normalizeChapterKey,
  extractChapterNumber,
  extractChapterNumFromTextOrSlug,
  mergeAndSortChapters,
} from '@/lib/aggregator';

describe('Decimal Chapters (e.g. 24.2, 0.5) handling', () => {
  it('Komiku: parses both Chapter 24 and Chapter 24.2 without overwriting', () => {
    const html = `
      <table id="Daftar_Chapter">
        <tbody>
          <tr>
            <td class="judulseries"><a href="/nano-machine-chapter-24-2/"><span>Chapter 24.2</span></a></td>
            <td class="tanggalseries">24/10/2026</td>
          </tr>
          <tr>
            <td class="judulseries"><a href="/nano-machine-chapter-24/"><span>Chapter 24</span></a></td>
            <td class="tanggalseries">23/10/2026</td>
          </tr>
        </tbody>
      </table>
    `;
    const chapters = parseKomikuChapters(html);
    expect(chapters).toHaveLength(2);
    expect(chapters.map(c => c.chapter)).toContain('24.2');
    expect(chapters.map(c => c.chapter)).toContain('24');
    expect(chapters.find(c => c.chapter === '24.2')?.title).toBe('Chapter 24.2');
  });

  it('Komiku fallback links: parses decimal chapter correctly', () => {
    const html = `
      <div>
        <a href="/one-piece-chapter-24-2/"><span>One Piece</span> Chapter 24.2</a>
        <a href="/one-piece-chapter-24/"><span>One Piece</span> Chapter 24</a>
      </div>
    `;
    const chapters = parseKomikuChapters(html);
    expect(chapters).toHaveLength(2);
    expect(chapters.map(c => c.chapter)).toContain('24.2');
    expect(chapters.map(c => c.chapter)).toContain('24');
  });

  it('Komikindo: parses Ch. 24.2 with URL chapter-24-2 correctly', () => {
    const html = `
      <div class="bxcl">
        <ul>
          <li>
            <span class="lchx"><a href="https://komikindo.ch/solo-chapter-24-2/">Ch. 24.2</a></span>
            <span class="dt">1 hari lalu</span>
          </li>
          <li>
            <span class="lchx"><a href="https://komikindo.ch/solo-chapter-24/">Ch. 24</a></span>
            <span class="dt">2 hari lalu</span>
          </li>
        </ul>
      </div>
    `;
    const chapters = parseKomikindoChapters(html);
    expect(chapters).toHaveLength(2);
    expect(chapters.map(c => c.chapter)).toContain('24.2');
    expect(chapters.map(c => c.chapter)).toContain('24');
  });

  it('MangaPill: parses Chapter 24.2 and Ch. 24.2 correctly', () => {
    const html = `
      <div>
        <a class="border p-1" href="/chapters/2-10024200/one-piece-chapter-24-2" title="Chapter 24.2">Chapter 24.2</a>
        <a class="border p-1" href="/chapters/2-10024000/one-piece-chapter-24" title="Chapter 24">Chapter 24</a>
      </div>
    `;
    const chapters = parseMangaPillChaptersHtml(html);
    expect(chapters).toHaveLength(2);
    expect(chapters.map(c => c.chapter)).toContain('24.2');
    expect(chapters.map(c => c.chapter)).toContain('24');
  });

  it('extractChapterNumFromTextOrSlug extracts accurately', () => {
    expect(extractChapterNumFromTextOrSlug('Chapter 24.2', '/nano-chapter-24-2/')).toBe('24.2');
    expect(extractChapterNumFromTextOrSlug('Ch. 24.2', '/nano-chapter-24-2/')).toBe('24.2');
    expect(extractChapterNumFromTextOrSlug('Ch 24.2', '/nano-chapter-24-2/')).toBe('24.2');
    expect(extractChapterNumFromTextOrSlug('Chapter 24 - 2', '/nano-chapter-24-2/')).toBe('24.2');
    expect(extractChapterNumFromTextOrSlug('Chapter 0.5', '/nano-chapter-0-5/')).toBe('0.5');
    expect(extractChapterNumFromTextOrSlug('', '/nano-chapter-24-2/')).toBe('24.2');
    expect(extractChapterNumFromTextOrSlug('', '/nano-chapter-24.2/')).toBe('24.2');
    expect(extractChapterNumFromTextOrSlug('', '/nano-chapter-24/')).toBe('24');
    expect(extractChapterNumFromTextOrSlug('', '/nano-chapter-24-bahasa-indonesia/')).toBe('24');
  });

  it('normalizeChapterKey & extractChapterNumber handle decimal and hyphenated sub-chapters', () => {
    expect(normalizeChapterKey('24.2')).toBe('24.2');
    expect(normalizeChapterKey('Chapter 24.2')).toBe('24.2');
    expect(normalizeChapterKey('Ch. 24.2')).toBe('24.2');
    expect(normalizeChapterKey('24-2')).toBe('24.2');
    expect(normalizeChapterKey('0.5')).toBe('0.5');

    expect(extractChapterNumber('komiku--nano-machine-chapter-24-2')).toBe('24.2');
    expect(extractChapterNumber('komikindo--solo-chapter-24-2-bahasa-indonesia')).toBe('24.2');
    expect(extractChapterNumber('komikindo--solo-chapter-24.2')).toBe('24.2');
    expect(extractChapterNumber('softkomik--slug__24.2')).toBe('24.2');
    expect(extractChapterNumber('softkomik--slug__0.5')).toBe('0.5');
  });

  it('mergeAndSortChapters keeps both 24 and 24.2 intact in correct order', () => {
    const merged = mergeAndSortChapters([
      { id: '1', chapter: '24', title: 'Chapter 24', scanlationGroup: '', publishAt: '', pagesCount: 0 },
      { id: '2', chapter: '24.2', title: 'Chapter 24.2', scanlationGroup: '', publishAt: '', pagesCount: 0 },
      { id: '3', chapter: '25', title: 'Chapter 25', scanlationGroup: '', publishAt: '', pagesCount: 0 },
    ]);

    expect(merged.map(c => c.chapter)).toEqual(['25', '24.2', '24']);
  });

  it('sortChapters sorts decimal numbers accurately both ascending and descending', () => {
    const list = [
      { id: '1', chapter: '24', title: 'Chapter 24', scanlationGroup: '', publishAt: '', pagesCount: 0 },
      { id: '2', chapter: '24.2', title: 'Chapter 24.2', scanlationGroup: '', publishAt: '', pagesCount: 0 },
      { id: '3', chapter: '25', title: 'Chapter 25', scanlationGroup: '', publishAt: '', pagesCount: 0 },
      { id: '4', chapter: '24.1', title: 'Chapter 24.1', scanlationGroup: '', publishAt: '', pagesCount: 0 },
    ];

    const desc = sortChapters(list, false);
    expect(desc.map(c => c.chapter)).toEqual(['25', '24.2', '24.1', '24']);

    const asc = sortChapters(list, true);
    expect(asc.map(c => c.chapter)).toEqual(['24', '24.1', '24.2', '25']);
  });
});
