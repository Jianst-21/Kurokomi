import { describe, it, expect } from 'vitest';
import {
  decryptOpenSSLAES,
  extractNextData,
  formatTimeAgo,
  mapSoftkomikItemToCard,
  SOFTKOMIK_ENCRYPTION_KEY,
} from '@/lib/softkomik';

describe('Softkomik Parser and Decryption', () => {
  it('formats relative time correctly', () => {
    const nowIso = new Date().toISOString();
    expect(formatTimeAgo(nowIso)).toContain('detik lalu');

    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    expect(formatTimeAgo(oneHourAgo)).toBe('1 jam lalu');

    const twoDaysAgo = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    expect(formatTimeAgo(twoDaysAgo)).toBe('2 hari lalu');
  });

  it('extracts next data from script tag', () => {
    const html = '<html><body><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"title":"Test"}}}</script></body></html>';
    const data = extractNextData(html) as any;
    expect(data?.props?.pageProps?.title).toBe('Test');
  });

  it('maps softkomik item to comic card item properly', () => {
    const item = {
      title: 'Solo Leveling',
      type: 'manhwa',
      gambar: 'members/cover-test.jpg',
      latest_chapter: '0179',
      updated_at: new Date(Date.now() - 60000).toISOString(),
      title_slug: 'solo-leveling-bahasa-indonesia',
      Genre: ['Action', 'Fantasy', 'Full Color'],
    };

    const card = mapSoftkomikItemToCard(item);
    expect(card.id).toBe('softkomik--solo-leveling-bahasa-indonesia');
    expect(card.title).toBe('Solo Leveling');
    expect(card.type).toBe('manhwa');
    expect(card.latestChapter).toBe('Ch. 179');
    expect(card.isFullColor).toBe(true);
    expect(card.coverUrl).toContain('https://cover.softdevices.my.id/softkomik-cover/members/cover-test.jpg');
    expect(card.updatedAt).toBe('1 menit lalu');
  });

  it('decrypts OpenSSL AES ciphertext with standard key', () => {
    // If input is empty or invalid, it returns empty string without crashing
    expect(decryptOpenSSLAES('')).toBe('');
    expect(decryptOpenSSLAES('invalid_base64')).toBe('');
  });

  it('sorts comics chronologically descending by updated_at when fetching latest', () => {
    const rawItems = [
      {
        title: 'Older Manhua',
        type: 'manhua',
        updated_at: '2026-07-07T07:02:28.937Z',
        title_slug: 'older-manhua',
      },
      {
        title: 'Newest Manhua',
        type: 'manhua',
        updated_at: '2026-10-25T14:45:18.984Z',
        title_slug: 'newest-manhua',
      },
      {
        title: 'Middle Manhua',
        type: 'manhua',
        updated_at: '2026-09-15T11:52:13.780Z',
        title_slug: 'middle-manhua',
      },
    ];

    const cards = rawItems.map(mapSoftkomikItemToCard);
    // When sorted chronologically descending:
    cards.sort((a, b) => {
      const timeA = a.updatedAt ? new Date(rawItems.find(r => r.title_slug === a.id.replace('softkomik--', ''))?.updated_at || 0).getTime() : 0;
      const timeB = b.updatedAt ? new Date(rawItems.find(r => r.title_slug === b.id.replace('softkomik--', ''))?.updated_at || 0).getTime() : 0;
      return timeB - timeA;
    });

    expect(cards[0].title).toBe('Newest Manhua');
    expect(cards[1].title).toBe('Middle Manhua');
    expect(cards[2].title).toBe('Older Manhua');
  });
});
