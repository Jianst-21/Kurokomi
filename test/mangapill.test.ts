import { describe, it, expect } from 'vitest';
import {
  parseMangaPillSearchHtml,
  parseMangaPillChaptersHtml,
  parseMangaPillImagesHtml,
} from '@/lib/mangapill';

describe('MangaPill Provider HTML Parsers', () => {
  it('parses search results html into comic cards', () => {
    const html = `
      <div class="grid my-5 grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <a href="/manga/2/one-piece" class="relative block">
            <figure class="w-full h-52 overflow-hidden bg-card rounded-md">
              <img data-src="https://cdn.readdetectiveconan.com/file/mangapill/i/2.webp" alt="One Piece" class="lazy object-cover"/>
            </figure>
          </a>
          <div class="flex flex-col">
            <a href="/manga/2/one-piece" class="font-bold">One Piece</a>
            <div class="text-xs text-secondary">Manga • 1997 • Completed</div>
          </div>
        </div>
      </div>
    `;

    const results = parseMangaPillSearchHtml(html);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('mangapill--manga___2___one-piece');
    expect(results[0].title).toBe('One Piece');
    expect(results[0].coverUrl).toBe('https://cdn.readdetectiveconan.com/file/mangapill/i/2.webp');
    expect(results[0].type).toBe('manga');
  });

  it('parses detail chapters html into ChapterItem list', () => {
    const html = `
      <div id="chapters" class="grid grid-cols-1">
        <a class="border p-1" href="/chapters/2-11196000/one-piece-chapter-1196" title="Chapter 1196">Chapter 1196</a>
        <a class="border p-1" href="/chapters/2-11195000/one-piece-chapter-1195" title="Chapter 1195">Chapter 1195</a>
      </div>
    `;

    const chapters = parseMangaPillChaptersHtml(html);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].id).toBe('mangapill--chapters___2-11196000___one-piece-chapter-1196');
    expect(chapters[0].chapter).toBe('1196');
    expect(chapters[0].title).toBe('Chapter 1196');
    expect(chapters[0].scanlationGroup).toBe('English Translation');

    expect(chapters[1].id).toBe('mangapill--chapters___2-11195000___one-piece-chapter-1195');
    expect(chapters[1].chapter).toBe('1195');
  });

  it('parses chapter image pages correctly', () => {
    const html = `
      <picture>
        <img class="js-page" data-src="https://cdn.readdetectiveconan.com/file/mangap/2026/43/2/1.jpeg" alt="Page 1"/>
      </picture>
      <picture>
        <img class="js-page" data-src="https://cdn.readdetectiveconan.com/file/mangap/2026/43/2/2.jpeg" alt="Page 2"/>
      </picture>
    `;

    const pages = parseMangaPillImagesHtml(html);
    expect(pages).toHaveLength(2);
    expect(pages[0].url).toBe('https://cdn.readdetectiveconan.com/file/mangap/2026/43/2/1.jpeg');
    expect(pages[0].fallbackUrl).toContain('/api/image-proxy?url=');
    expect(pages[1].url).toBe('https://cdn.readdetectiveconan.com/file/mangap/2026/43/2/2.jpeg');
  });
});
