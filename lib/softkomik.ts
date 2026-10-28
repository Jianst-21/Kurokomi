import crypto from 'node:crypto';
import { ComicCardItem, ComicDetail, ChapterItem, ChapterPageItem } from './types';
import { deduplicateChapters, sortChapters } from './mangadex';
import { scoreTitleMatch, generateSearchQueries } from './komiku';
import { isSafeContent, filterSafeGenres } from './security';

export const SOFTKOMIK_BASE = 'https://softkomik.app';
export const SOFTKOMIK_COVER_BASE = 'https://cover.softdevices.my.id/softkomik-cover';
export const SOFTKOMIK_IMAGE_BASE = 'https://image.komik.im/softkomik';
export const SOFTKOMIK_ENCRYPTION_KEY = 'nYTInq9MwR4pWa8yeXtu/2iO3t9nGP65WHpWEvqpEdU=';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 4000;

export function decryptOpenSSLAES(ciphertextB64: string, keyStr: string = SOFTKOMIK_ENCRYPTION_KEY): string {
  try {
    const ciphertextBytes = Buffer.from(ciphertextB64, 'base64');
    if (ciphertextBytes.length < 16) return '';
    if (ciphertextBytes.subarray(0, 8).toString() !== 'Salted__') {
      return '';
    }
    const salt = ciphertextBytes.subarray(8, 16);
    const data = ciphertextBytes.subarray(16);

    const password = Buffer.from(keyStr, 'utf8');
    let hash = Buffer.alloc(0);
    const totalBytesNeeded = 32 + 16;
    const keyAndIv = Buffer.alloc(totalBytesNeeded);
    let written = 0;

    while (written < totalBytesNeeded) {
      const md5 = crypto.createHash('md5');
      md5.update(hash);
      md5.update(password);
      md5.update(salt);
      hash = md5.digest();
      const copyLen = Math.min(hash.length, totalBytesNeeded - written);
      hash.copy(keyAndIv, written, 0, copyLen);
      written += copyLen;
    }

    const key = keyAndIv.subarray(0, 32);
    const iv = keyAndIv.subarray(32, 48);

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(data);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

export function extractNextData(html: string): Record<string, unknown> | null {
  try {
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return null;
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

export function formatTimeAgo(isoString?: string): string | undefined {
  if (!isoString) return undefined;
  try {
    const past = new Date(isoString).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - past) / 1000);
    if (diffSec < 60) return `${Math.max(1, diffSec)} detik lalu`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} menit lalu`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} jam lalu`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay} hari lalu`;
    const diffMonth = Math.floor(diffDay / 30);
    return `${diffMonth} bulan lalu`;
  } catch {
    return undefined;
  }
}

export interface SoftkomikRawItem {
  _id?: string;
  title: string;
  type?: string;
  gambar?: string;
  latest_chapter?: string;
  updated_at?: string;
  title_slug: string;
  Genre?: string[];
  contentRating?: string;
  altTitle?: string;
  sinopsis?: string;
  status?: string;
  author?: string;
  artist?: string;
}

export function mapSoftkomikItemToCard(item: SoftkomikRawItem): ComicCardItem {
  const rawType = (item.type || 'other').toLowerCase();
  let type: 'manga' | 'manhwa' | 'manhua' | 'other' = 'other';
  if (rawType.includes('manhwa')) type = 'manhwa';
  else if (rawType.includes('manhua')) type = 'manhua';
  else if (rawType.includes('manga')) type = 'manga';

  let coverUrl = '';
  if (item.gambar) {
    coverUrl = item.gambar.startsWith('http')
      ? item.gambar
      : `${SOFTKOMIK_COVER_BASE}/${item.gambar}`;
  }

  let latestChapter: string | undefined;
  if (item.latest_chapter) {
    const cleanedNum = item.latest_chapter.replace(/^0+/, '') || '0';
    latestChapter = `Ch. ${cleanedNum}`;
  }

  const isFullColor = (item.Genre || []).some(g =>
    g.toLowerCase().includes('color') || g.toLowerCase().includes('warna')
  );

  return {
    id: `softkomik--${item.title_slug}`,
    title: item.title,
    altTitle: item.altTitle,
    coverUrl,
    type,
    latestChapter,
    updatedAt: formatTimeAgo(item.updated_at),
    genres: filterSafeGenres(item.Genre || []),
    isFullColor,
    source: 'softkomik',
  };
}

export async function fetchSoftkomikLatest(
  type: 'manga' | 'manhwa' | 'manhua' | 'all' = 'manhwa',
  page: number = 1,
  limit: number = 10
): Promise<ComicCardItem[]> {
  try {
    const url = type === 'all'
      ? `${SOFTKOMIK_BASE}/komik/update?page=${page}&category=normal`
      : `${SOFTKOMIK_BASE}/komik/type/${type}?page=${page}&category=normal`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 60 },
    });

    if (!res.ok) return [];
    const html = await res.text();
    const nextData = extractNextData(html) as Record<string, unknown> | null;
    const pageProps = (nextData?.props as Record<string, unknown>)?.pageProps as Record<string, unknown> | undefined;
    if (!pageProps) return [];

    let rawList: SoftkomikRawItem[] = [];
    if (pageProps.initialData && Array.isArray((pageProps.initialData as Record<string, unknown>).data)) {
      rawList = (pageProps.initialData as Record<string, unknown>).data as SoftkomikRawItem[];
    } else if (pageProps.data && Array.isArray((pageProps.data as Record<string, unknown>).data)) {
      rawList = (pageProps.data as Record<string, unknown>).data as SoftkomikRawItem[];
    }

    const items = rawList
      .filter(item => item.contentRating !== '18+' && item.contentRating !== 'adult' && item.contentRating !== 'ecchi')
      .sort((a, b) => {
        const timeA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const timeB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return timeB - timeA;
      })
      .map(mapSoftkomikItemToCard)
      .filter(isSafeContent);

    return items.slice(0, limit);
  } catch (e) {
    console.error('fetchSoftkomikLatest error:', e);
    return [];
  }
}

export async function searchSoftkomik(query: string): Promise<ComicCardItem[]> {
  try {
    const clean = query.trim();
    if (!clean) return [];

    const url = `${SOFTKOMIK_BASE}/komik/list?name=${encodeURIComponent(clean)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 120 },
    });

    if (!res.ok) return [];
    const html = await res.text();
    const nextData = extractNextData(html) as Record<string, unknown> | null;
    const pageProps = (nextData?.props as Record<string, unknown>)?.pageProps as Record<string, unknown> | undefined;
    if (!pageProps?.initialData) return [];

    const rawList = ((pageProps.initialData as Record<string, unknown>).data || []) as SoftkomikRawItem[];
    return rawList
      .filter(item => item.contentRating !== '18+' && item.contentRating !== 'adult' && item.contentRating !== 'ecchi')
      .map(mapSoftkomikItemToCard)
      .filter(isSafeContent);
  } catch (e) {
    console.error('searchSoftkomik error:', e);
    return [];
  }
}

const SLUG_CACHE_TTL_MS = 15 * 60 * 1000;
const softkomikSlugCache = new Map<string, { slug: string | null; exp: number }>();

export async function findSoftkomikSlug(title: string, altTitles: string[] = []): Promise<string | null> {
  const cacheKey = `${title.toLowerCase()}_${(altTitles || []).join('_').toLowerCase()}`;
  const cached = softkomikSlugCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) {
    return cached.slug;
  }

  const queries = generateSearchQueries(title, altTitles);

  for (const q of queries) {
    try {
      const comics = await searchSoftkomik(q);
      if (comics.length === 0) continue;

      let bestSlug: string | null = null;
      let highestScore = 0;

      for (const comic of comics) {
        const score1 = scoreTitleMatch(title, comic.title);
        const score2 = comic.altTitle ? scoreTitleMatch(title, comic.altTitle) : 0;
        let score = Math.max(score1, score2);

        for (const alt of altTitles) {
          score = Math.max(score, scoreTitleMatch(alt, comic.title));
          if (comic.altTitle) {
            score = Math.max(score, scoreTitleMatch(alt, comic.altTitle));
          }
        }

        if (score > highestScore) {
          highestScore = score;
          bestSlug = comic.id.replace(/^softkomik--/, '');
        }
      }

      if (highestScore >= 60 && bestSlug) {
        softkomikSlugCache.set(cacheKey, { slug: bestSlug, exp: Date.now() + SLUG_CACHE_TTL_MS });
        return bestSlug;
      }
    } catch {
      // try next query
    }
  }

  softkomikSlugCache.set(cacheKey, { slug: null, exp: Date.now() + SLUG_CACHE_TTL_MS });
  return null;
}

export async function fetchSoftkomikDetail(slug: string): Promise<ComicDetail | null> {
  const tryFetch = async (targetSlug: string): Promise<ComicDetail | null> => {
    try {
      const url = `${SOFTKOMIK_BASE}/${targetSlug}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: 300 },
      });

      if (!res.ok) return null;
      const html = await res.text();
      const nextData = extractNextData(html) as Record<string, unknown> | null;
      const pageProps = (nextData?.props as Record<string, unknown>)?.pageProps as Record<string, unknown> | undefined;
      const stk = pageProps?._stk as string | undefined;
      if (!stk) return null;

      const decryptedStr = decryptOpenSSLAES(stk);
      if (!decryptedStr) return null;

      const parsed = JSON.parse(decryptedStr);
      const data = (parsed.data || {}) as SoftkomikRawItem;
      if (!data.title) return null;

      const rawType = (data.type || 'other').toLowerCase();
      let type: 'manga' | 'manhwa' | 'manhua' | 'other' = 'other';
      if (rawType.includes('manhwa')) type = 'manhwa';
      else if (rawType.includes('manhua')) type = 'manhua';
      else if (rawType.includes('manga')) type = 'manga';

      let coverUrl = '';
      if (data.gambar) {
        coverUrl = data.gambar.startsWith('http')
          ? data.gambar
          : `${SOFTKOMIK_COVER_BASE}/${data.gambar}`;
      }

      const rawStatus = (data.status || 'ongoing').toLowerCase();
      let status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled' = 'ongoing';
      if (rawStatus.includes('tamat') || rawStatus.includes('end') || rawStatus.includes('complete')) {
        status = 'completed';
      }

      const safeGenres = filterSafeGenres(data.Genre || []);
      if (!isSafeContent({ title: data.title, genres: safeGenres, contentRating: data.contentRating })) {
        return null;
      }

      const isFullColor = safeGenres.some(g =>
        g.toLowerCase().includes('color') || g.toLowerCase().includes('warna')
      );

      return {
        id: `softkomik--${targetSlug}`,
        title: data.title,
        altTitles: data.altTitle ? [data.altTitle] : [],
        description: data.sinopsis || 'Tidak ada sinopsis.',
        coverUrl,
        type,
        status,
        genres: safeGenres,
        isFullColor,
        author: data.author,
        artist: data.artist,
      };
    } catch {
      return null;
    }
  };

  const direct = await tryFetch(slug);
  if (direct) return direct;

  if (!slug.endsWith('-bahasa-indonesia')) {
    const withSuffix = await tryFetch(`${slug}-bahasa-indonesia`);
    if (withSuffix) return withSuffix;
  }
  return null;
}

export async function fetchSoftkomikChapters(slug: string): Promise<ChapterItem[]> {
  const tryFetch = async (targetSlug: string): Promise<ChapterItem[]> => {
    try {
      const url = `${SOFTKOMIK_BASE}/${targetSlug}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: 120 },
      });

      if (!res.ok) return [];
      const html = await res.text();
      const nextData = extractNextData(html) as Record<string, unknown> | null;
      const pageProps = (nextData?.props as Record<string, unknown>)?.pageProps as Record<string, unknown> | undefined;
      const stk = pageProps?._stk as string | undefined;
      if (!stk) return [];

      const decryptedStr = decryptOpenSSLAES(stk);
      if (!decryptedStr) return [];

      const parsed = JSON.parse(decryptedStr);
      const chapterList = (parsed.chapterData?.chapter || []) as Array<{ chapter: string }>;

      const chapters: ChapterItem[] = chapterList.map(ch => {
        const cleanNum = String(ch.chapter).replace(/^0+/, '') || '0';
        return {
          id: `softkomik--${targetSlug}__${ch.chapter}`,
          chapter: cleanNum,
          title: `Chapter ${cleanNum}`,
          scanlationGroup: 'Softkomik Sub Indo',
          publishAt: '',
          pagesCount: 0,
        };
      });

      return deduplicateChapters(sortChapters(chapters, false));
    } catch {
      return [];
    }
  };

  const direct = await tryFetch(slug);
  if (direct.length > 0) return direct;

  if (!slug.endsWith('-bahasa-indonesia')) {
    const withSuffix = await tryFetch(`${slug}-bahasa-indonesia`);
    if (withSuffix.length > 0) return withSuffix;
  }
  return [];
}

export async function fetchSoftkomikChapterImages(slug: string, chapter: string): Promise<ChapterPageItem[]> {
  const slugCandidates = [slug];
  if (!slug.endsWith('-bahasa-indonesia')) {
    slugCandidates.push(`${slug}-bahasa-indonesia`);
  } else {
    slugCandidates.push(slug.replace(/-bahasa-indonesia$/, ''));
  }

  const chapterCandidates: string[] = [chapter];
  if (chapter.includes('.')) {
    const [maj, min] = chapter.split('.');
    chapterCandidates.push(`${maj.padStart(3, '0')}.${min}`);
    chapterCandidates.push(`${parseInt(maj, 10)}.${min}`);
  } else {
    chapterCandidates.push(chapter.padStart(3, '0'));
    const parsedInt = parseInt(chapter, 10);
    if (!isNaN(parsedInt)) {
      chapterCandidates.push(String(parsedInt));
    }
  }
  const uniqueChapters = [...new Set(chapterCandidates)];

  for (const targetSlug of slugCandidates) {
    for (const ch of uniqueChapters) {
      try {
        const url = `${SOFTKOMIK_BASE}/${targetSlug}/chapter/${ch}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          next: { revalidate: 3600 },
        });

        if (!res.ok) continue;
        const html = await res.text();
        const nextData = extractNextData(html) as Record<string, unknown> | null;
        const pageProps = (nextData?.props as Record<string, unknown>)?.pageProps as Record<string, unknown> | undefined;
        const stk = pageProps?._stk as string | undefined;
        if (!stk) continue;

        const decryptedStr = decryptOpenSSLAES(stk);
        if (!decryptedStr) continue;

        const parsed = JSON.parse(decryptedStr);
        const imgList = (parsed.imgList || []) as string[];
        if (!imgList.length) continue;

        return imgList.map(img => {
          const fullUrl = img.startsWith('http') ? img : `${SOFTKOMIK_IMAGE_BASE}/${img}`;
          return {
            url: fullUrl,
            fallbackUrl: `/api/image-proxy?url=${encodeURIComponent(fullUrl)}`,
          };
        });
      } catch {
        // try next candidate
      }
    }
  }

  return [];
}
