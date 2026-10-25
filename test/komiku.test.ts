import { describe, it, expect } from 'vitest';
import {
  parseKomikuSearchResults,
  parseKomikuChapters,
  scoreTitleMatch,
  generateSearchQueries,
} from '@/lib/komiku';

describe('Komiku Provider Smart Parsers & Matchers', () => {
  const sampleSearchHtml = `
    <div class="bge">
      <div class="bgei">
        <a href="/manga/one-piece-ace-story/">
          <img src="https://thumbnail.komiku.org/uploads/ace.jpg" />
          <div class="tpe1_inf"><b>Manga</b> Action</div>
        </a>
      </div>
      <div class="kan">
        <a href="/manga/one-piece-ace-story/">
          <h3>One Piece: Ace Story</h3>
        </a>
      </div>
    </div>
    <div class="bge">
      <div class="bgei">
        <a href="/manga/komik-one-piece-indo/">
          <img src="https://thumbnail.komiku.org/uploads/op.jpg" />
          <div class="tpe1_inf"><b>Manga</b> Adventure</div>
        </a>
      </div>
      <div class="kan">
        <a href="/manga/komik-one-piece-indo/">
          <h3>One Piece</h3>
        </a>
      </div>
    </div>
  `;

  it('parses Komiku search results correctly', () => {
    const results = parseKomikuSearchResults(sampleSearchHtml);
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('komiku--one-piece-ace-story');
    expect(results[0].title).toBe('One Piece: Ace Story');
    expect(results[0].type).toBe('manga');
    expect(results[1].id).toBe('komiku--komik-one-piece-indo');
    expect(results[1].title).toBe('One Piece');
  });

  it('scores exact matches higher than spin-offs to prevent wrong comic matching', () => {
    const exactScore = scoreTitleMatch('One Piece', 'One Piece');
    const spinOffScore = scoreTitleMatch('One Piece', 'One Piece: Ace Story');
    expect(exactScore).toBeGreaterThan(spinOffScore);
    expect(spinOffScore).toBeLessThan(90);

    const soloExact = scoreTitleMatch('Solo Leveling', 'Solo Leveling');
    const soloRagnarok = scoreTitleMatch('Solo Leveling', 'Solo Leveling: Ragnarok');
    expect(soloExact).toBeGreaterThan(soloRagnarok);
  });

  const sampleChapterHtml = `
    <table id="Daftar_Chapter">
      <tbody>
        <tr>
          <td class="judulseries">
            <a href="/one-piece-chapter-1100/"><span>One Piece</span> Chapter 1100</a>
          </td>
          <td class="tanggalserua">20/10/2026</td>
        </tr>
        <tr>
          <td class="judulseries">
            <a href="/one-piece-chapter-1099/"><span>One Piece</span> Chapter 1099</a>
          </td>
          <td class="tanggalserua">13/10/2026</td>
        </tr>
      </tbody>
    </table>
  `;

  it('parses Komiku chapters with publish date when available in table', () => {
    const chapters = parseKomikuChapters(sampleChapterHtml);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].id).toBe('komiku--one-piece-chapter-1100');
    expect(chapters[0].chapter).toBe('1100');
    expect(chapters[0].publishAt).toBe('20/10/2026');

    expect(chapters[1].id).toBe('komiku--one-piece-chapter-1099');
    expect(chapters[1].chapter).toBe('1099');
    expect(chapters[1].publishAt).toBe('13/10/2026');

    const realKomikuHtml = `
      <table id="Daftar_Chapter">
        <tbody>
          <tr itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
            <td class="judulseries"><meta itemprop="position" content="1"><a href="/the-extras-academy-survival-guide-chapter-129/" itemprop="url"><span itemprop="name"><b>Chapter 129</b></span></a></td>
            <td class="tanggalseries">23/10/2026</td>
          </tr>
        </tbody>
      </table>
    `;
    const realChapters = parseKomikuChapters(realKomikuHtml);
    expect(realChapters).toHaveLength(1);
    expect(realChapters[0].id).toBe('komiku--the-extras-academy-survival-guide-chapter-129');
    expect(realChapters[0].chapter).toBe('129');
    expect(realChapters[0].publishAt).toBe('23/10/2026');
  });

  it('generates queries with curly apostrophes and shortened prefixes for complex titles', () => {
    const queries = generateSearchQueries(
      "Xie'e Lianjin Shushi Gao Buding Ziji De Shiyan Ti",
      ["The Evil Alchemist Can't Handle His Own Experiment"]
    );
    // Must generate curly apostrophe variant to match WordPress MySQL LIKE '%...%'
    expect(queries).toContain("The Evil Alchemist Can’t Handle His Own Experiment");
    // Must generate prefix without contraction
    expect(queries).toContain("The Evil Alchemist Can");
    // Must generate 3-word prefix
    expect(queries).toContain("The Evil Alchemist");
  });
});
