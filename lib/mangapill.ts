import { ComicCardItem, ChapterItem, ChapterPageItem } from './types';
import { generateSearchQueries, scoreTitleMatch } from './komiku';
import { isSafeContent } from './security';

export const MANGAPILL_BASE = 'https://mangapill.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 8000;

const MANGAPILL_CACHE_TTL = 15 * 60 * 1000;
const mangapillSlugCache = new Map<string, { path: string | null; exp: number }>();

export function parseMangaPillSearchHtml(html: string): ComicCardItem[] {
  const items: ComicCardItem[] = [];
  const cardRegex = /<a href="(\/manga\/(\d+)\/([^"]+))"[^>]*class="relative block"[\s\S]*?<div class="flex flex-col[^"]*">([\s\S]*?)<\/div>\s*<\/div>/gi;
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const rawPath = match[1];
    const fullBlock = match[0];
    const infoPart = match[4];

    const imgMatch = fullBlock.match(/<img[^>]+(?:data-src|src)="([^"]+)"/i);
    const coverUrl = imgMatch ? imgMatch[1] : '';

    const titleMatches = [...infoPart.matchAll(/<div[^>]*class="[^"]*(?:font-black|line-clamp-2)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)];
    const primaryTitle = titleMatches[0] ? titleMatches[0][1].replace(/<[^>]+>/g, '').trim() : '';
    const altTitle = titleMatches[1] ? titleMatches[1][1].replace(/<[^>]+>/g, '').trim() : undefined;

    if (!primaryTitle) continue;

    const typeMatch = infoPart.match(/(Manga|Manhwa|Manhua)/i);
    let type: 'manga' | 'manhwa' | 'manhua' | 'other' = 'manga';
    if (typeMatch) {
      const t = typeMatch[1].toLowerCase();
      if (t === 'manhwa') type = 'manhwa';
      else if (t === 'manhua') type = 'manhua';
      else if (t === 'manga') type = 'manga';
    }

    const cleanId = rawPath.replace(/^\//, '').replace(/\//g, '___');

    items.push({
      id: `mangapill--${cleanId}`,
      title: primaryTitle,
      altTitle,
      altTitles: altTitle ? [altTitle] : undefined,
      coverUrl,
      type,
    });
  }

  return items.filter(isSafeContent);
}

export function parseMangaPillChaptersHtml(html: string): ChapterItem[] {
  const chapters: ChapterItem[] = [];
  const chRegex = /<a class="[^"]*" href="(\/chapters\/([^"]+))"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = chRegex.exec(html)) !== null) {
    const rawPath = match[1];
    const rawTitle = match[3].replace(/<[^>]+>/g, '').trim();
    const numMatch = rawTitle.match(/Chapter\s+([0-9.]+)/i);
    const chapterNum = numMatch ? numMatch[1] : '0';

    const cleanId = rawPath.replace(/^\//, '').replace(/\//g, '___');

    chapters.push({
      id: `mangapill--${cleanId}`,
      chapter: chapterNum,
      title: rawTitle || `Chapter ${chapterNum}`,
      scanlationGroup: 'English Translation',
      publishAt: '',
      pagesCount: 0,
    });
  }

  return chapters;
}

export function parseMangaPillImagesHtml(html: string): ChapterPageItem[] {
  const pages: ChapterPageItem[] = [];
  const imgMatches = [...html.matchAll(/<img[^>]+(?:class="js-page"[^>]+data-src|data-src|src)="([^"]+)"/gi)];

  for (const m of imgMatches) {
    const src = m[1];
    if (
      src &&
      src.startsWith('http') &&
      !src.includes('logo') &&
      !src.includes('favicon') &&
      !src.includes('banner')
    ) {
      pages.push({
        url: src,
        fallbackUrl: `/api/image-proxy?url=${encodeURIComponent(src)}`,
      });
    }
  }

  return pages;
}

export async function searchMangaPill(query: string): Promise<ComicCardItem[]> {
  const clean = query.trim();
  if (!clean) return [];

  try {
    const res = await fetch(`${MANGAPILL_BASE}/search?q=${encodeURIComponent(clean)}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];
    const html = await res.text();
    return parseMangaPillSearchHtml(html);
  } catch (e) {
    console.error('searchMangaPill error:', e);
    return [];
  }
}

export async function findMangaPillPath(title: string, altTitles: string[] = []): Promise<string | null> {
  const cacheKey = `${title.toLowerCase()}_${(altTitles || []).join('_').toLowerCase()}`;
  const cached = mangapillSlugCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) {
    return cached.path;
  }

  const queries = generateSearchQueries(title, altTitles);
  const targets = [title, ...(altTitles || [])].filter(Boolean);

  let bestPath: string | null = null;
  let highestScore = 0;

  for (const q of queries.slice(0, 3)) {
    try {
      const candidates = await searchMangaPill(q);
      if (!candidates || candidates.length === 0) continue;

      for (const card of candidates) {
        for (const target of targets) {
          const score = scoreTitleMatch(target, card.title);
          if (score >= 90) {
            const path = '/' + card.id.replace(/^mangapill--/, '').replace(/___/g, '/');
            mangapillSlugCache.set(cacheKey, { path, exp: Date.now() + MANGAPILL_CACHE_TTL });
            return path;
          }
          if (score > highestScore && score >= 70) {
            highestScore = score;
            bestPath = '/' + card.id.replace(/^mangapill--/, '').replace(/___/g, '/');
          }
        }
      }

      if (highestScore >= 80 && bestPath) {
        mangapillSlugCache.set(cacheKey, { path: bestPath, exp: Date.now() + MANGAPILL_CACHE_TTL });
        return bestPath;
      }
    } catch {
      // try next
    }
  }

  mangapillSlugCache.set(cacheKey, { path: bestPath, exp: Date.now() + MANGAPILL_CACHE_TTL });
  return bestPath;
}

export async function fetchMangaPillChapters(mangaPath: string): Promise<ChapterItem[]> {
  try {
    const cleanPath = mangaPath.startsWith('/') ? mangaPath : `/${mangaPath}`;
    const url = `${MANGAPILL_BASE}${cleanPath}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 120 },
    });

    if (!res.ok) return [];
    const html = await res.text();
    return parseMangaPillChaptersHtml(html);
  } catch (e) {
    console.error('fetchMangaPillChapters error:', e);
    return [];
  }
}

export async function fetchMangaPillChapterImages(chapterPath: string): Promise<ChapterPageItem[]> {
  try {
    const cleanPath = chapterPath.startsWith('/') ? chapterPath : `/${chapterPath}`;
    const url = `${MANGAPILL_BASE}${cleanPath}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];
    const html = await res.text();
    return parseMangaPillImagesHtml(html);
  } catch (e) {
    console.error('fetchMangaPillChapterImages error:', e);
    return [];
  }
}
