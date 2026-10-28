import { describe, it, expect } from 'vitest';
import { parseKomikindoLatestUpdates } from '../lib/komikindo';
import { mapSoftkomikItemToCard } from '../lib/softkomik';
import { parseKomikuLatestUpdates } from '../lib/komiku';

describe('Comic Source Attribution', () => {
  it('assigns source: "komikindo" to cards parsed from Komikindo', () => {
    const html = `
      <div class="animepost">
        <a href="https://komikindo.ch/komik/solo-leveling/"></a>
        <h3><a>Solo Leveling</a></h3>
        <div class="lsch"><a href="#">Ch. 179</a></div>
        <span class="datech">5 menit lalu</span>
      </div></div></div>
    `;
    const cards = parseKomikindoLatestUpdates(html);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0].source).toBe('komikindo');
  });

  it('assigns source: "softkomik" to cards mapped from Softkomik', () => {
    const card = mapSoftkomikItemToCard({
      title: 'Solo Leveling',
      title_slug: 'solo-leveling',
      latest_chapter: '179',
      type: 'manhwa',
      updated_at: new Date().toISOString(),
    });
    expect(card.source).toBe('softkomik');
  });

  it('assigns source: "komiku" to cards parsed from Komiku', () => {
    const html = `
      <div class="bge">
        <a href="https://komiku.org/manga/solo-leveling/"></a>
        <h3>Solo Leveling</h3>
        <span>Terbaru: </span><span>Chapter 179</span>
        <span class="judul2">Aksi | 10 menit lalu</span>
      </div></div>
    `;
    const cards = parseKomikuLatestUpdates(html);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0].source).toBe('komiku');
  });
});
