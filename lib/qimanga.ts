import { ComicCardItem, ComicDetail, ChapterItem, ChapterPageItem } from './types';
import { scoreTitleMatch, generateSearchQueries } from './komiku';

export const QIMANGA_BASE = 'https://qimanga.com';
export const QIMANGA_API_BASE = 'https://api.qimanga.com/api/v1';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 8000;

const qimangaSlugCache = new Map<string, { slug: string | null; exp: number }>();
const SLUG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function searchQimanga(query: string): Promise<ComicCardItem[]> {
  try {
    const clean = query.trim();
    if (!clean) return [];

    const url = `${QIMANGA_API_BASE}/series/search?q=${encodeURIComponent(clean)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];
    const json = await res.json();
    const data = json.data || json;
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => ({
      id: `qimanga--${item.slug}`,
      title: item.title,
      coverUrl: item.cover || '',
      type: (item.type?.toLowerCase() || 'other') as any,
      source: 'qimanga',
    }));
  } catch (err) {
    console.error('searchQimanga error:', err);
    return [];
  }
}

export async function findQimangaSlug(title: string, altTitles?: string[]): Promise<string | null> {
  const cacheKey = `${title.toLowerCase()}_${(altTitles || []).join('_').toLowerCase()}`;
  const cached = qimangaSlugCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) {
    return cached.slug;
  }

  const queries = generateSearchQueries(title, altTitles);
  const targets = [title, ...(altTitles || [])].filter(Boolean);
  let bestSlug: string | null = null;
  let highestScore = 0;

  for (const q of queries.slice(0, 6)) {
    try {
      const results = await searchQimanga(q);
      if (!results || results.length === 0) continue;

      for (const card of results) {
        for (const target of targets) {
          const score = scoreTitleMatch(target, card.title);
          if (score === 100) {
            const exactSlug = card.id.replace(/^qimanga--/, '');
            qimangaSlugCache.set(cacheKey, { slug: exactSlug, exp: Date.now() + SLUG_CACHE_TTL_MS });
            return exactSlug;
          }
          if (score > highestScore && score >= 60) {
            highestScore = score;
            bestSlug = card.id.replace(/^qimanga--/, '');
          }
        }
      }

      if (highestScore >= 80 && bestSlug) {
        qimangaSlugCache.set(cacheKey, { slug: bestSlug, exp: Date.now() + SLUG_CACHE_TTL_MS });
        return bestSlug;
      }
    } catch {
      // try next
    }
  }

  qimangaSlugCache.set(cacheKey, { slug: bestSlug, exp: Date.now() + SLUG_CACHE_TTL_MS });
  return bestSlug;
}

export async function fetchQimangaChapters(slug: string): Promise<ChapterItem[]> {
  try {
    const cleanSlug = slug.replace(/^qimanga--/, '').replace(/^\//, '').replace(/\/$/, '');
    const url = `${QIMANGA_API_BASE}/series/${encodeURIComponent(cleanSlug)}/chapters?page=1&perPage=100`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];
    const json = await res.json();
    const data = json.data || json;
    if (!Array.isArray(data)) return [];

    return data
      .filter((ch: any) => ch.publishStatus === 'PUBLIC' && ch.isFree !== false)
      .map((ch: any) => {
        const chapterNum = String(ch.number || ch.slug?.replace(/^chapter-/, '') || '0');
        return {
          id: `qimanga--${cleanSlug}__${ch.slug}`,
          chapter: chapterNum,
          title: ch.title || `Chapter ${chapterNum}`,
          scanlationGroup: 'QiManga (EN)',
          publishAt: ch.createdAt || '',
          pagesCount: 0,
        };
      });
  } catch (err) {
    console.error('fetchQimangaChapters error:', err);
    return [];
  }
}

export async function fetchQimangaDetail(slug: string): Promise<ComicDetail | null> {
  try {
    const cleanSlug = slug.replace(/^qimanga--/, '').replace(/^\//, '').replace(/\/$/, '');
    const url = `${QIMANGA_API_BASE}/series/${encodeURIComponent(cleanSlug)}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !data.title) return null;

    let altTitles: string[] = [];
    if (data.alternativeTitles && typeof data.alternativeTitles === 'string') {
      altTitles = data.alternativeTitles.split(/[•;,|]/).map((s: string) => s.trim()).filter(Boolean);
    } else if (Array.isArray(data.alternativeTitles)) {
      altTitles = data.alternativeTitles.map((s: any) => String(s).trim()).filter(Boolean);
    }

    const rawType = (data.type || 'other').toLowerCase();
    let type: 'manga' | 'manhwa' | 'manhua' | 'other' = 'other';
    if (rawType.includes('manhwa')) type = 'manhwa';
    else if (rawType.includes('manhua')) type = 'manhua';
    else if (rawType.includes('manga')) type = 'manga';

    const genres = Array.isArray(data.genres) ? data.genres.map((g: any) => g.name || g).filter(Boolean) : [];

    return {
      id: `qimanga--${cleanSlug}`,
      title: data.title,
      altTitles,
      description: data.description ? data.description.replace(/<[^>]+>/g, '').trim() : 'Tidak ada sinopsis.',
      coverUrl: data.cover || '',
      type,
      status: (data.status?.toLowerCase() === 'completed' ? 'completed' : 'ongoing'),
      genres,
      isFullColor: rawType.includes('manhwa') || rawType.includes('manhua'),
      author: data.author,
      artist: data.artist,
    };
  } catch (err) {
    console.error('fetchQimangaDetail error:', err);
    return null;
  }
}

export async function fetchQimangaChapterImages(comicSlug: string, chapterSlugOrNum: string): Promise<ChapterPageItem[]> {
  try {
    const cleanComic = comicSlug.replace(/^qimanga--/, '').replace(/^\//, '').replace(/\/$/, '');
    let chapterPart = chapterSlugOrNum.replace(/^chapter-/, '');
    const cleanChapter = chapterSlugOrNum.startsWith('chapter-') ? chapterSlugOrNum : `chapter-${chapterPart}`;

    const url = `${QIMANGA_API_BASE}/series/${encodeURIComponent(cleanComic)}/chapters/${encodeURIComponent(cleanChapter)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];
    const json = await res.json();
    const images: any[] = json.images || [];

    return images
      .map((img: any) => (typeof img === 'string' ? img : img.url))
      .filter(Boolean)
      .map((url: string) => ({
        url,
        fallbackUrl: `/api/image-proxy?url=${encodeURIComponent(url)}`,
      }));
  } catch (err) {
    console.error('fetchQimangaChapterImages error:', err);
    return [];
  }
}
