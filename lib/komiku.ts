import { ComicCardItem, ComicDetail, ChapterItem, ChapterPageItem } from './types';
import { deduplicateChapters, sortChapters } from './mangadex';
import { isSafeContent, filterSafeGenres, isValidCoverUrl } from './security';

export const KOMIKU_BASE = 'https://komiku.org';
export const KOMIKU_API_SEARCH = 'https://api.komiku.org';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 4000;

export function normalizeTitle(t: string): string {
  if (!t) return '';
  return t
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\[.*?\]/g, ' ')
    .replace(/\{.*?\}/g, ' ')
    .replace(/['’`]/g, '')
    .replace(/[-_~]/g, ' ')
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

  // Token overlap ratio with support for Romaji particle variants (ha vs wa, wo vs o)
  const normalizeParticle = (token: string) => {
    if (token === 'ha') return 'wa';
    if (token === 'wo') return 'o';
    return token;
  };

  const qNormalizedTokens = qTokens.map(normalizeParticle);
  const cNormalizedTokens = cTokens.map(normalizeParticle);

  // Check if all query tokens are present
  const allInCandidate = qNormalizedTokens.every(qt => cNormalizedTokens.includes(qt));
  if (allInCandidate) {
    const extraTokens = cNormalizedTokens.length - qNormalizedTokens.length;
    if (extraTokens === 0) return 100;
    return Math.max(50, 95 - extraTokens * 10);
  }

  const matched = qNormalizedTokens.filter(qt => cNormalizedTokens.includes(qt)).length;
  const matchRatio = matched / Math.max(qNormalizedTokens.length, cNormalizedTokens.length);
  if (matchRatio >= 0.75) {
    return Math.round(matchRatio * 90);
  }

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
      source: 'komiku',
    });
  }

  return items.filter(isSafeContent);
}

export function parseKomikuLatestUpdates(html: string): ComicCardItem[] {
  const items: ComicCardItem[] = [];
  const bgeRegex = /<div class="bge">([\s\S]*?)<\/div>\s*<\/div>/g;
  let match;

  while ((match = bgeRegex.exec(html)) !== null) {
    const block = match[1];

    const linkMatch = block.match(/<a href="([^"]+)"/);
    if (!linkMatch) continue;
    const href = linkMatch[1];
    const slug = href.replace(/^https?:\/\/komiku\.org/, '').replace(/^\/manga\//, '').replace(/\/$/, '');

    let title = slug;
    const titleMatch = block.match(/<h3>\s*([^<]+)\s*<\/h3>/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
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

    // Latest chapter from "Terbaru"
    let latestChapter: string | undefined;
    const chMatch =
      block.match(/<span>Terbaru:\s*<\/span>\s*<span>([^<]+)<\/span>/i) ||
      block.match(/title="[^"]*(Chapter\s*[0-9.]+)[^"]*"/i);
    if (chMatch) {
      const rawCh = chMatch[1].trim();
      latestChapter = rawCh.toLowerCase().startsWith('chapter') || rawCh.toLowerCase().startsWith('ch')
        ? rawCh
        : `Ch. ${rawCh}`;
    }

    // Time & Genres from judul2
    let updatedAt: string | undefined;
    const genres: string[] = [];
    const judul2Match = block.match(/<span class="judul2">([\s\S]*?)<\/span>/i);
    if (judul2Match) {
      const parts = judul2Match[1].split('|').map(p => p.trim()).filter(Boolean);
      for (const p of parts) {
        if (
          p.toLowerCase().includes('lalu') ||
          p.toLowerCase().includes('hari') ||
          p.toLowerCase().includes('jam') ||
          p.toLowerCase().includes('menit') ||
          p.toLowerCase().includes('detik')
        ) {
          updatedAt = p;
        } else if (p.toLowerCase() !== 'berwarna') {
          genres.push(p);
        }
      }
    }

    const isFullColor = block.toLowerCase().includes('berwarna');

    items.push({
      id: `komiku--${slug}`,
      title,
      coverUrl,
      type,
      latestChapter,
      updatedAt,
      genres: filterSafeGenres(genres),
      isFullColor,
      source: 'komiku',
    });
  }

  return items.filter(isSafeContent);
}

export async function fetchKomikuLatest(
  type: 'manga' | 'manhwa' | 'manhua' | 'all' = 'manhwa',
  page: number = 1
): Promise<ComicCardItem[]> {
  try {
    const tipeParam = type && type !== 'all' ? `&tipe=${type}` : '';
    const pagedParam = page > 1 ? `&paged=${page}` : '';
    const url = `${KOMIKU_API_SEARCH}/?post_type=manga&orderby=modified${tipeParam}${pagedParam}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 60 },
    });

    if (!res.ok) return [];
    const html = await res.text();
    return parseKomikuLatestUpdates(html);
  } catch (e) {
    console.error('fetchKomikuLatest error:', e);
    return [];
  }
}

export function parseKomikuChapters(html: string): ChapterItem[] {
  const chapters: ChapterItem[] = [];

  // 1. Try parsing table format with tanggal (matches both 'tanggalseries' and 'tanggalserua')
  const tableRowMatches = [
    ...html.matchAll(
      /<tr[^>]*>[\s\S]*?<td class="judulseries"[^>]*>[\s\S]*?<a href="(\/([^" ?#]*chapter-([0-9.]+)[^"]*))"[^>]*>[\s\S]*?<\/td>[\s\S]*?<td class="tanggal[^"]*"[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi
    ),
  ];

  if (tableRowMatches.length > 0) {
    for (const m of tableRowMatches) {
      const exactChapterSlug = m[2].replace(/\/$/, '');
      const chapterNum = m[3];
      const publishAt = m[4].replace(/<[^>]+>/g, '').trim();

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

    // Status: check inftable row first, fallback to text
    let status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled' = 'ongoing';
    const statusMatch = html.match(/<td>Status:<\/td>\s*<td>([\s\S]*?)<\/td>/i);
    if (statusMatch) {
      const statusText = statusMatch[1].replace(/<[^>]+>/g, '').toLowerCase().trim();
      if (statusText.includes('tamat') || statusText.includes('completed') || statusText.includes('end')) {
        status = 'completed';
      }
    } else if (html.toLowerCase().includes('tamat') || html.toLowerCase().includes('completed')) {
      status = 'completed';
    }

    // Exact Comic Type: check inftable row or post meta, NEVER the entire HTML (to avoid navbar links)
    let type: 'manga' | 'manhwa' | 'manhua' | 'other' = 'other';
    const typeMatch =
      html.match(/<td>Tipe:<\/td>\s*<td>([\s\S]*?)<\/td>/i) ||
      html.match(/<td>Jenis Komik:<\/td>\s*<td>([\s\S]*?)<\/td>/i) ||
      html.match(/<div class="tpe1_inf"[^>]*>[\s\S]*?<b>\s*(Manga|Manhwa|Manhua)\s*<\/b>/i);
    if (typeMatch) {
      const raw = typeMatch[1].replace(/<[^>]+>/g, '').toLowerCase().trim();
      if (raw.includes('manhwa')) type = 'manhwa';
      else if (raw.includes('manhua')) type = 'manhua';
      else if (raw.includes('manga')) type = 'manga';
    } else {
      // Fallback: check breadcrumb area only
      const breadcrumbMatch = html.match(/<ul id="breadcrumb"[\s\S]*?<\/ul>/i);
      if (breadcrumbMatch) {
        const bText = breadcrumbMatch[0].toLowerCase();
        if (bText.includes('manhwa')) type = 'manhwa';
        else if (bText.includes('manhua')) type = 'manhua';
        else if (bText.includes('manga')) type = 'manga';
      }
    }

    // Alt Titles
    const altTitles: string[] = [];
    const altMatch = html.match(/<td>Judul Alternatif:<\/td>\s*<td>([\s\S]*?)<\/td>/i);
    if (altMatch) {
      const rawAlt = altMatch[1].replace(/<[^>]+>/g, '').trim();
      if (rawAlt && rawAlt !== '-' && rawAlt !== title && !altTitles.includes(rawAlt)) {
        altTitles.push(rawAlt);
      }
    }

    // Author
    let author: string | undefined = undefined;
    const authorMatch = html.match(/<td>Author:<\/td>\s*<td>([\s\S]*?)<\/td>/i) ||
                        html.match(/<td>Pengarang:<\/td>\s*<td>([\s\S]*?)<\/td>/i);
    if (authorMatch) {
      const rawAuthor = authorMatch[1].replace(/<[^>]+>/g, '').trim();
      if (rawAuthor && rawAuthor !== '-') author = rawAuthor;
    }

    const genres: string[] = [];
    const genreMatches = [...html.matchAll(/<ul class="genre"[^>]*>([\s\S]*?)<\/ul>/gi)];
    if (genreMatches[0]) {
      const aMatches = [...genreMatches[0][1].matchAll(/<a[^>]*>([^<]+)<\/a>/gi)];
      for (const gm of aMatches) {
        const g = gm[1].trim();
        if (g && !genres.includes(g)) genres.push(g);
      }
    }

    const isFullColor = Boolean(
      type === 'manhwa' ||
      type === 'manhua' ||
      html.toLowerCase().includes('berwarna')
    );

    const safeGenres = filterSafeGenres(genres);
    if (!isSafeContent({ title, genres: safeGenres })) {
      return null;
    }

    return {
      id: `komiku--${slug}`,
      title,
      altTitles,
      description,
      coverUrl,
      type,
      status,
      genres: safeGenres,
      isFullColor,
      author,
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

export function generateSearchQueries(title: string, altTitles?: string[]): string[] {
  const rawList = [title, ...(altTitles || [])].filter(Boolean);
  const queries = new Set<string>();

  function addClean(q?: string) {
    if (!q) return;
    const clean = q.trim();
    if (clean.length >= 4 && /[a-zA-Z]/.test(clean)) {
      queries.add(clean);
    }
  }

  // 1. Add base titles first (title, and altTitles) so altTitles like Japanese Romaji are checked early
  for (const raw of rawList) {
    addClean(raw);
  }

  // Prioritize ASCII/English titles before titles with tone marks/accents
  const asciiList: string[] = [];
  const otherList: string[] = [];

  for (const raw of rawList) {
    const clean = raw.trim();
    if (!/[a-zA-Z]/.test(clean)) continue;
    if (/^[\x00-\x7F\u2019\u2018\u201C\u201D]+$/.test(clean)) {
      asciiList.push(clean);
    } else {
      otherList.push(clean);
    }
  }

  const sortedRaw = [...asciiList, ...otherList];

  for (const clean of sortedRaw) {
    // 1. Full clean title
    addClean(clean);

    // 2. Straight / Curly apostrophe conversion
    if (clean.includes("'")) {
      addClean(clean.replace(/'/g, '’'));
    }
    if (clean.includes('’')) {
      addClean(clean.replace(/’/g, "'"));
    }

    // 3. Substring before punctuation (: , - , ( , [)
    const punctMatch = clean.match(/^([^:\-\(\[\/]+)/);
    if (punctMatch && punctMatch[1]) {
      const p = punctMatch[1].trim();
      if (p !== clean && p.split(/\s+/).length >= 2) {
        addClean(p);
      }
    }

    // 4. Substring before apostrophe / contraction
    const aposMatch = clean.match(/^([^'’]+)/);
    if (aposMatch && aposMatch[1]) {
      const a = aposMatch[1].trim();
      if (a !== clean && a.split(/\s+/).length >= 2) {
        addClean(a);
      }
    }

    // 5. Shorten long titles to first 3-4 words
    const words = clean.replace(/[:\-]/g, ' ').split(/\s+/).filter(Boolean);
    if (words.length > 3) {
      addClean(words.slice(0, 3).join(' '));
      addClean(words.slice(0, 4).join(' '));
      if (words[0].toLowerCase() === 'the' && words.length > 2) {
        addClean(words.slice(1, 4).join(' '));
      }
    }
  }

  return Array.from(queries);
}

const SLUG_CACHE_TTL_MS = 15 * 60 * 1000;
const komikuSlugCache = new Map<string, { slug: string | null; exp: number }>();

export async function findKomikuSlug(title: string, altTitles?: string[]): Promise<string | null> {
  const cacheKey = `${title.toLowerCase()}_${(altTitles || []).join('_').toLowerCase()}`;
  const cached = komikuSlugCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) {
    return cached.slug;
  }

  const titlesToTry = generateSearchQueries(title, altTitles);
  const targets = [title, ...(altTitles || [])].filter(Boolean);

  let bestSlug: string | null = null;
  let highestScore = 0;

  for (const t of titlesToTry.slice(0, 10)) {
    try {
      const candidates = await searchKomiku(t);
      if (!candidates || candidates.length === 0) continue;

      for (const card of candidates) {
        for (const target of targets) {
          const score = scoreTitleMatch(target, card.title);
          if (score === 100) {
            const exactSlug = card.id.replace(/^komiku--/, '');
            komikuSlugCache.set(cacheKey, { slug: exactSlug, exp: Date.now() + SLUG_CACHE_TTL_MS });
            return exactSlug;
          }
          if (score > highestScore && score >= 60) {
            highestScore = score;
            bestSlug = card.id.replace(/^komiku--/, '');
          }
        }
      }

      if (highestScore >= 80 && bestSlug) {
        komikuSlugCache.set(cacheKey, { slug: bestSlug, exp: Date.now() + SLUG_CACHE_TTL_MS });
        return bestSlug;
      }
    } catch (e) {
      console.error('findKomikuSlug error:', e);
    }
  }

  komikuSlugCache.set(cacheKey, { slug: bestSlug, exp: Date.now() + SLUG_CACHE_TTL_MS });
  return bestSlug;
}

export async function fetchKomikuChapters(slug: string): Promise<ChapterItem[]> {
  try {
    const url = `${KOMIKU_BASE}/manga/${slug}/`;
    let res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const realSlug = await findKomikuSlug(slug);
      if (realSlug && realSlug !== slug) {
        res = await fetch(`${KOMIKU_BASE}/manga/${realSlug}/`, {
          headers: { 'User-Agent': USER_AGENT },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          next: { revalidate: 300 },
        });
      }
    }

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
    const targetHtml = imgIdx !== -1 ? html.slice(imgIdx) : html;

    const imgMatches = [...targetHtml.matchAll(/src="([^"]+)"/g)];

    const urls = imgMatches
      .map(m => m[1])
      .filter(u => u && u.startsWith('http') && !u.includes('promosi') && !u.includes('iklan') && !u.includes('logo') && !u.endsWith('.gif'))
      .map(u => u.replace(/^http:\/\//i, 'https://'));

    return urls.map(u => ({
      url: u,
      fallbackUrl: `/api/image-proxy?url=${encodeURIComponent(u)}`,
    }));
  } catch (e) {
    console.error('fetchKomikuChapterImages error:', e);
    return [];
  }
}
