import { describe, it, expect } from 'vitest';
import {
  parseKomikindoSearchResults,
  parseKomikindoLatestUpdates,
  parseKomikindoDetail,
  parseKomikindoChapters,
  parseKomikindoImages,
} from '@/lib/komikindo';

describe('Komikindo Provider Parsers', () => {
  const sampleSearchHtml = `
    <div class="listupd">
      <div class="film-list">
        <div class="animepost">
          <div class="animposx">
            <a href="https://komikindo.ch/komik/solo-leveling-ragnarok/" title="Komik Solo Leveling: Ragnarok">
              <span class="typeflag Manhwa"></span>
              <img src="https://komikindo.ch/wp-content/uploads/solo-ragnarok.jpg" />
            </a>
            <div class="bigors">
              <div class="tt">
                <h3>
                  <a href="https://komikindo.ch/komik/solo-leveling-ragnarok/">Solo Leveling: Ragnarok</a>
                </h3>
              </div>
            </div>
          </div>
        </div>
        <div class="animepost">
          <div class="animposx">
            <a href="https://komikindo.ch/komik/229848-solo-leveling/" title="Komik Solo Leveling">
              <span class="typeflag Manhwa"></span>
              <img src="https://komikindo.ch/wp-content/uploads/solo-leveling.jpg" />
            </a>
            <div class="bigors">
              <div class="tt">
                <h3>
                  <a href="https://komikindo.ch/komik/229848-solo-leveling/">Solo Leveling</a>
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  it('parses search results correctly', () => {
    const results = parseKomikindoSearchResults(sampleSearchHtml);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      id: 'komikindo--solo-leveling-ragnarok',
      title: 'Solo Leveling: Ragnarok',
      coverUrl: 'https://komikindo.ch/wp-content/uploads/solo-ragnarok.jpg',
      type: 'manhwa',
      isFullColor: false,
      source: 'komikindo',
    });
    expect(results[1].id).toBe('komikindo--229848-solo-leveling');
    expect(results[1].title).toBe('Solo Leveling');
  });

  const sampleLatestHtml = `
    <div class="animepost">
      <div class="animposx">
        <a href="https://komikindo.ch/komik/steel-eating-player/" title="Komik Steel-Eating Player">
          <div class="warnalabel">Warna</div>
          <span class="typeflag Manhwa"></span>
          <img src="https://komikindo.ch/wp-content/uploads/steel.jpg" />
        </a>
        <div class="bigors">
          <div class="tt">
            <h3>
              <a href="https://komikindo.ch/komik/steel-eating-player/">Steel-Eating Player</a>
            </h3>
          </div>
          <div class="adds">
            <div class="lsch">
              <a href="https://komikindo.ch/steel-eating-player-chapter-103/">Ch. 103</a>
              <span class="datech">3 menit lalu</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  it('parses latest updates with chapter, relative date and full color', () => {
    const items = parseKomikindoLatestUpdates(sampleLatestHtml);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      id: 'komikindo--steel-eating-player',
      title: 'Steel-Eating Player',
      coverUrl: 'https://komikindo.ch/wp-content/uploads/steel.jpg',
      type: 'manhwa',
      latestChapter: 'Ch. 103',
      updatedAt: '3 menit lalu',
      isFullColor: true,
      source: 'komikindo',
    });
  });

  it('sorts latest updates chronologically descending by relative date', () => {
    const multiLatestHtml = `
      <div class="animepost">
        <div class="animposx">
          <a href="https://komikindo.ch/komik/older-manhua/">
            <img src="https://komikindo.ch/wp-content/uploads/1.jpg" />
          </a>
          <div class="bigors">
            <div class="tt"><h3><a href="https://komikindo.ch/komik/older-manhua/">Older</a></h3></div>
            <div class="adds"><div class="lsch"><span class="datech">3 bulan lalu</span></div></div>
          </div>
        </div>
      </div>
      <div class="animepost">
        <div class="animposx">
          <a href="https://komikindo.ch/komik/newer-manhua/">
            <img src="https://komikindo.ch/wp-content/uploads/2.jpg" />
          </a>
          <div class="bigors">
            <div class="tt"><h3><a href="https://komikindo.ch/komik/newer-manhua/">Newer</a></h3></div>
            <div class="adds"><div class="lsch"><span class="datech">2 hari lalu</span></div></div>
          </div>
        </div>
      </div>
    `;
    const items = parseKomikindoLatestUpdates(multiLatestHtml);
    expect(items[0].title).toBe('Newer');
    expect(items[1].title).toBe('Older');
  });

  const sampleDetailHtml = `
    <div class="infoanime">
      <h1 class="entry-title">Komik Solo Leveling</h1>
      <div class="thumb">
        <img src="https://komikindo.ch/wp-content/uploads/solo.jpg" />
      </div>
      <div class="spe">
        <span><b>Status:</b> Completed</span>
        <span><b>Jenis Komik:</b> Manhwa</span>
        <span><b>Pengarang:</b> Chugong</span>
        <span><b>Artis:</b> DUBU(REDICE STUDIO)</span>
      </div>
      <div class="genre-info">
        <a href="/genres/action/">Action</a>
        <a href="/genres/fantasy/">Fantasy</a>
      </div>
      <div class="entry-content entry-content-single">
        <p>10 tahun yang lalu, setelah "Gerbang" yang menghubungkan dunia nyata terbuka...</p>
      </div>
    </div>
  `;

  it('parses detail correctly', () => {
    const detail = parseKomikindoDetail(sampleDetailHtml, '229848-solo-leveling');
    expect(detail).not.toBeNull();
    expect(detail?.id).toBe('komikindo--229848-solo-leveling');
    expect(detail?.title).toBe('Solo Leveling');
    expect(detail?.status).toBe('completed');
    expect(detail?.type).toBe('manhwa');
    expect(detail?.author).toBe('Chugong');
    expect(detail?.genres).toEqual(['Action', 'Fantasy']);
    expect(detail?.description).toContain('10 tahun yang lalu');
  });

  it('parses detail with linked type tags correctly for Manhua', () => {
    const sampleManhuaDetail = `
      <h1 class="entry-title">Scoring the Sacred Body</h1>
      <div class="spe">
        <span><b>Judul Alternatif:</b> Kaiju Qiandao, Ancient Holy Body</span>
        <span><b>Status:</b> Berjalan</span>
        <span><b>Pengarang:</b> Xingkong</span>
        <span><b>Jenis Komik:</b> <a href="/manhua">Manhua</a></span>
      </div>
    `;
    const detail = parseKomikindoDetail(sampleManhuaDetail, 'scoring-the-sacred-body');
    expect(detail?.type).toBe('manhua');
    expect(detail?.altTitles).toContain('Ancient Holy Body');
    expect(detail?.author).toBe('Xingkong');
    expect(detail?.status).toBe('ongoing');
  });

  const sampleChapterListHtml = `
    <div class="bxcl" id="chapter_list">
      <ul>
        <li>
          <span class="lchx">
            <a href="https://komikindo.ch/solo-leveling-chapter-179-end/">Chapter 179</a>
          </span>
          <span class="dt">5 hari lalu</span>
        </li>
        <li>
          <span class="lchx">
            <a href="https://komikindo.ch/solo-leveling-chapter-178/">Chapter 178</a>
          </span>
          <span class="dt">12 Oktober 2026</span>
        </li>
      </ul>
    </div>
  `;

  it('parses chapter list correctly with dates', () => {
    const chapters = parseKomikindoChapters(sampleChapterListHtml);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].id).toBe('komikindo--solo-leveling-chapter-179-end');
    expect(chapters[0].chapter).toBe('179');
    expect(chapters[0].scanlationGroup).toBe('Komikindo Sub Indo');
    expect(chapters[0].publishAt).toBe('5 hari lalu');

    expect(chapters[1].id).toBe('komikindo--solo-leveling-chapter-178');
    expect(chapters[1].chapter).toBe('178');
    expect(chapters[1].publishAt).toBe('12 Oktober 2026');
  });

  const sampleReaderHtml = `
    <div id="readerarea">
      <img src="https://blogger.googleusercontent.com/img/page1.jpg" />
      <img src="https://blogger.googleusercontent.com/img/page2.jpg" />
    </div>
  `;

  it('parses chapter reader images correctly', () => {
    const images = parseKomikindoImages(sampleReaderHtml);
    expect(images).toHaveLength(2);
    expect(images[0].url).toBe('https://blogger.googleusercontent.com/img/page1.jpg');
    expect(images[1].url).toBe('https://blogger.googleusercontent.com/img/page2.jpg');
  });
});
