import { ComicCardItem, ComicDetail, ChapterItem, ChapterPageItem } from './types';
import { deduplicateChapters, sortChapters } from './mangadex';

export const KOMIKU_BASE = 'https://komiku.org';
export const KOMIKU_API_SEARCH = 'https://api.komiku.org';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 8000;

export function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function scoreTitleMatch(query: string, candidate: string): number {
  const qNorm = normalizeTitle(query);
  const cNorm = normalizeTitle(candidate);

  if (!qNorm || !cNorm) return 0;
  if (qNorm === cNorm) return 100;

  const qTokens = qNorm.split(' ').filter(Boolean);
  const cTokens = cNorm.split(' ').filter(Boolean);

  if (qTokens.length === 0 || cTokens.length === 0) return 0;

  // Check if all query tokens are present in candidate tokens
  const allInCandidate = qTokens.every(qt => cTokens.includes(qt));
  if (allInCandidate) {
    const extraTokens = cTokens.length - qTokens.length;
    if (extraTokens === 0) return 100;
    // Penalize spin-offs/subtitles (e.g., "One Piece: Ace Story" has 2 extra tokens)
    return Math.max(50, 90 - extraTokens * 15);
  }

  // Token overlap ratio
  const matched = qTokens.filter(qt => cTokens.includes(qt)).length;
  return Math.round((matched / qTokens.length) * 50);
}

export function parseKomikuSearchResults(html: string): ComicCardItem[] {
  const items: ComicCardItem[] = [];
  const bgeRegex = /<div class="bge">([\s\S]*?)<\/div>\s*<\/div>/g;
  let match;

  while ((match = bgeRegex.exec(html)) !== null) {
    const block = match[1];

    const linkMatch = block.match(/<a href="([^"]+)"/);
    if (!linkMatch) continue;
    const href = linkMatch[1];
    const slug = href.replace(/^\/manga\//, '').replace(/\/$/, '');

    let title = '';
    const titleMatch = block.match(/<h3>\s*([^<]+)\s*<\/h3>/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
    } else {
      const altMatch = block.match(/alt="([^"]+)"/i);
      title = altMatch ? altMatch[1].trim() : slug;
    }

    const imgMatch = block.match(/<img[^>]+src="([^"]+)"/i);
    const coverUrl = imgMatch ? imgMatch[1] : '';

    let type: 'manga' | 'manhwa' | 'manhua' | 'other' = 'other';
    const typeMatch = block.match(/<b>\s*(Manga|Manhwa|Manhua)\s*<\/b>/i);
    if (typeMatch) {
      const raw = typeMatch[1].toLowerCase();
      if (raw.includes('manhwa')) type = 'manhwa';
      else if (raw.includes('manhua')) type = 'manhua';
      else if (raw.includes('manga')) type = 'manga';
    }

    items.push({
      id: `komiku--${slug}`,
      title,
      coverUrl,
      type,
      isFullColor: false,
    });
  }

  return items;
}

export function parseKomikuChapters(html: string): ChapterItem[] {
  const chapters: ChapterItem[] = [];

  // 1. Try parsing table format with tanggal
  const tableRowMatches = [...html.matchAll(/<tr>[\s\S]*?<td class="judulseries">[\s\S]*?<a href="(\/([^"]*chapter-([0-9.]+)[^"]*))"[\s\S]*?<td class="tanggalserua">([^<]+)<\/td>[\s\S]*?<\/tr>/gi)];

  if (tableRowMatches.length > 0) {
    for (const m of tableRowMatches) {
      const exactChapterSlug = m[2].replace(/\/$/, '');
      const chapterNum = m[3];
      const publishAt = m[4].trim();

      chapters.push({
        id: `komiku--${exactChapterSlug}`,
        chapter: chapterNum,
        title: `Chapter ${chapterNum}`,
        scanlationGroup: 'Komiku Sub Indo',
        publishAt,
        pagesCount: 0,
      });
    }
  } else {
    // 2. Fallback: match any chapter links
    const matches = [...html.matchAll(/href="(\/([^"]*chapter-([0-9.]+)[^"]*))"/g)];
    for (const m of matches) {
      const exactChapterSlug = m[2].replace(/\/$/, '');
      const chapterNum = m[3];
      chapters.push({
        id: `komiku--${exactChapterSlug}`,
        chapter: chapterNum,
        title: `Chapter ${chapterNum}`,
        scanlationGroup: 'Komiku Sub Indo',
        publishAt: '',
        pagesCount: 0,
      });
    }
  }

  return sortChapters(deduplicateChapters(chapters), false);
}

export function parseKomikuDetail(html: string, slug: string): ComicDetail | null {
  try {
    let title = slug;
    const titleMatch = html.match(/<h1[^>]*itemprop="name"[^>]*>([\s\S]*?)<\/h1>/i) ||
                       html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/<[^>]+>/g, '').replace(/^Komik\s+/i, '').trim();
    }

    const coverMatch = html.match(/<div class="ims"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i) ||
                        html.match(/<img[^>]+class="[^"]*lazy[^"]*"[^>]+src="([^"]+)"/i);
    const coverUrl = coverMatch ? coverMatch[1] : '';

    let description = 'Tidak ada sinopsis.';
    const descMatch = html.match(/<p class="desc"[^>]*>([\s\S]*?)<\/p>/i) ||
                       html.match(/<div class="sinopsis"[^>]*>([\s\S]*?)<\/div>/i);
    if (descMatch) {
      description = descMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    let status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled' = 'ongoing';
    if (html.toLowerCase().includes('tamat') || html.toLowerCase().includes('completed')) {
      status = 'completed';
    }

    let type: 'manga' | 'manhwa' | 'manhua' | 'other' = 'other';
    if (html.toLowerCase().includes('manhwa')) type = 'manhwa';
    else if (html.toLowerCase().includes('manhua')) type = 'manhua';
    else if (html.toLowerCase().includes('manga')) type = 'manga';

    const genres: string[] = [];
    const genreMatches = [...html.matchAll(/<ul class="genre"[^>]*>([\s\S]*?)<\/ul>/gi)];
    if (genreMatches[0]) {
      const aMatches = [...genreMatches[0][1].matchAll(/<a[^>]*>([^<]+)<\/a>/gi)];
      for (const gm of aMatches) {
        const g = gm[1].trim();
        if (g && !genres.includes(g)) genres.push(g);
      }
    }

    return {
      id: `komiku--${slug}`,
      title,
      altTitles: [],
      description,
      coverUrl,
      type,
      status,
      genres,
      isFullColor: false,
    };
  } catch (e) {
    console.error('parseKomikuDetail error:', e);
    return null;
  }
}

export async function searchKomiku(query: string): Promise<ComicCardItem[]> {
  try {
    const searchUrl = `${KOMIKU_API_SEARCH}/?post_type=manga&s=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const html = await res.text();
    return parseKomikuSearchResults(html);
  } catch (e) {
    console.error('searchKomiku error:', e);
    return [];
  }
}

export async function fetchKomikuDetail(slug: string): Promise<ComicDetail | null> {
  try {
    const url = `${KOMIKU_BASE}/manga/${slug}/`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return parseKomikuDetail(html, slug);
  } catch (e) {
    console.error('fetchKomikuDetail error:', e);
    return null;
  }
}

export async function findKomikuSlug(title: string, altTitles?: string[]): Promise<string | null> {
  // Filter for titles that have Latin/ASCII characters
  const rawTitles = [title, ...(altTitles || [])].filter(Boolean);
  const titlesToTry: string[] = [];

  for (const t of rawTitles) {
    const clean = t.trim();
    // Prioritize titles with Latin characters
    if (/[a-zA-Z]/.test(clean)) {
      titlesToTry.push(clean);
      const normalized = clean.replace(/\(.*?\)/g, '').replace(/[:\-]/g, ' ').replace(/\s+/g, ' ').trim();
      if (normalized && normalized !== clean && !titlesToTry.includes(normalized)) {
        titlesToTry.push(normalized);
      }
    }
  }

  let bestSlug: string | null = null;
  let highestScore = 0;

  for (const t of titlesToTry.slice(0, 6)) {
    try {
      const candidates = await searchKomiku(t);
      if (!candidates || candidates.length === 0) continue;

      for (const card of candidates) {
        const score = scoreTitleMatch(t, card.title);
        if (score === 100) {
          return card.id.replace(/^komiku--/, '');
        }
        if (score > highestScore && score >= 60) {
          highestScore = score;
          bestSlug = card.id.replace(/^komiku--/, '');
        }
      }

      if (highestScore >= 80 && bestSlug) {
        return bestSlug;
      }
    } catch (e) {
      console.error('findKomikuSlug error:', e);
    }
  }

  return bestSlug;
}

export async function fetchKomikuChapters(slug: string): Promise<ChapterItem[]> {
  try {
    const url = `${KOMIKU_BASE}/manga/${slug}/`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const html = await res.text();
    return parseKomikuChapters(html);
  } catch (e) {
    console.error('fetchKomikuChapters error:', e);
    return [];
  }
}

export async function fetchKomikuChapterImages(chapterSlug: string, fallbackChapterNum?: string): Promise<ChapterPageItem[]> {
  try {
    let cleanSlug = chapterSlug.replace(/^\//, '').replace(/\/$/, '');

    if (cleanSlug.startsWith('komiku--')) {
      cleanSlug = cleanSlug.replace(/^komiku--/, '');
    }

    // 1. Fetch using exact chapter slug
    let url = `${KOMIKU_BASE}/${cleanSlug}/`;
    let res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });

    // 2. If 404 and cleanSlug has parts, try alternative reconstructed URL
    if (!res.ok && cleanSlug.includes('--')) {
      const parts = cleanSlug.split('--');
      const s = parts[0];
      const ch = parts[1] || fallbackChapterNum;
      url = `${KOMIKU_BASE}/${s}-chapter-${ch}/`;
      res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: 300 },
      });
    }

    if (!res.ok) return [];

    const html = await res.text();
    const imgIdx = html.indexOf('id="Baca_Komik"');
    if (imgIdx === -1) return [];

    const endIdx = html.indexOf('</div>', imgIdx + 2000);
    const slice = html.slice(imgIdx, endIdx !== -1 ? endIdx : html.length);
    const imgMatches = [...slice.matchAll(/src="([^"]+)"/g)];

    const urls = imgMatches
      .map(m => m[1])
      .filter(u => u && u.startsWith('http') && !u.includes('promosi') && !u.includes('iklan'));

    return urls.map(u => ({
      url: u,
      fallbackUrl: u,
    }));
  } catch (e) {
    console.error('fetchKomikuChapterImages error:', e);
    return [];
  }
}
