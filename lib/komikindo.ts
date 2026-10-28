import { ComicCardItem, ComicDetail, ChapterItem, ChapterPageItem } from './types';
import { deduplicateChapters, sortChapters } from './mangadex';
import { scoreTitleMatch, generateSearchQueries } from './komiku';
import { isSafeContent, filterSafeGenres, isValidCoverUrl } from './security';
import { parseDateScore } from './date';

export const KOMIKINDO_BASE = 'https://komikindo.ch';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 4000;

export function parseKomikindoSearchResults(html: string): ComicCardItem[] {
  const items: ComicCardItem[] = [];
  const cardRegex = /<div class="animepost">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const block = match[1];

    // Extract link & slug
    const linkMatch = block.match(/href="https?:\/\/komikindo\.ch\/komik\/([^\/"]+)\/?"/);
    if (!linkMatch) continue;
    const slug = linkMatch[1];

    // Extract title
    let title = '';
    const titleMatch = block.match(/<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
    } else {
      const altMatch = block.match(/title="Komik\s+([^"]+)"/i) || block.match(/title="([^"]+)"/);
      title = altMatch ? altMatch[1].trim() : slug;
    }
    title = title.replace(/^Komik\s+/i, '').trim();

    // Extract image with fallback to data-src and logo rejection
    const imgMatches = [...block.matchAll(/(?:data-src|data-lazy-src|data-original|src)="([^"]+)"/gi)];
    let coverUrl = '';
    for (const im of imgMatches) {
      if (isValidCoverUrl(im[1])) {
        coverUrl = im[1];
        break;
      }
    }

    // Extract comic type
    let type: 'manga' | 'manhwa' | 'manhua' | 'other' = 'other';
    const typeMatch = block.match(/class="typeflag\s+([^"]+)"/i);
    if (typeMatch) {
      const rawType = typeMatch[1].toLowerCase();
      if (rawType.includes('manhwa')) type = 'manhwa';
      else if (rawType.includes('manhua')) type = 'manhua';
      else if (rawType.includes('manga')) type = 'manga';
    }

    items.push({
      id: `komikindo--${slug}`,
      title,
      coverUrl,
      type,
      isFullColor: false,
      source: 'komikindo',
    });
  }

  // Fallback: if regex didn't catch nested divs, match animposx directly
  if (items.length === 0) {
    const fallbackMatches = [...html.matchAll(/<div class="animposx">[\s\S]*?<a href="https?:\/\/komikindo\.ch\/komik\/([^\/"]+)\/?"[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/gi)];
    for (const m of fallbackMatches) {
      const slug = m[1];
      const coverUrl = m[2];
      const title = m[3].replace(/<[^>]+>/g, '').replace(/^Komik\s+/i, '').trim();
      items.push({
        id: `komikindo--${slug}`,
        title,
        coverUrl,
        type: 'other',
        isFullColor: false,
      });
    }
  }

  return items.filter(isSafeContent);
}

export function parseKomikindoLatestUpdates(html: string): ComicCardItem[] {
  const items: ComicCardItem[] = [];
  const cardRegex = /<div class="animepost">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let match;

  while ((match = cardRegex.exec(html)) !== null) {
    const block = match[1];

    const linkMatch = block.match(/href="https?:\/\/komikindo\.ch\/komik\/([^\/"]+)\/?"/);
    if (!linkMatch) continue;
    const slug = linkMatch[1];

    let title = slug;
    const titleMatch = block.match(/<h3>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/<[^>]+>/g, '').replace(/^Komik\s+/i, '').trim();
    }

    const imgMatches = [...block.matchAll(/(?:data-src|data-lazy-src|data-original|src)="([^"]+)"/gi)];
    let coverUrl = '';
    for (const im of imgMatches) {
      if (isValidCoverUrl(im[1])) {
        coverUrl = im[1];
        break;
      }
    }

    let type: 'manga' | 'manhwa' | 'manhua' | 'other' = 'other';
    const typeMatch = block.match(/class="typeflag\s+([^"]+)"/i);
    if (typeMatch) {
      const rawType = typeMatch[1].toLowerCase();
      if (rawType.includes('manhwa')) type = 'manhwa';
      else if (rawType.includes('manhua')) type = 'manhua';
      else if (rawType.includes('manga')) type = 'manga';
    }

    const chMatch = block.match(/class="lsch"[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
    const latestChapter = chMatch ? chMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;

    const dateMatch = block.match(/class="datech">([\s\S]*?)<\/span>/i);
    const updatedAt = dateMatch ? dateMatch[1].replace(/<[^>]+>/g, '').trim() : undefined;

    const isFullColor = block.includes('warnalabel') || block.includes('Warna');

    items.push({
      id: `komikindo--${slug}`,
      title,
      coverUrl,
      type,
      latestChapter,
      updatedAt,
      isFullColor,
      source: 'komikindo',
    });
  }

  return items
    .filter(isSafeContent)
    .sort((a, b) => {
      const scoreA = parseDateScore(a.updatedAt);
      const scoreB = parseDateScore(b.updatedAt);
      if (scoreA > 0 && scoreB > 0 && scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return 0;
    });
}

export async function fetchKomikindoLatest(
  type: 'manga' | 'manhwa' | 'manhua' | 'all' = 'manhwa',
  page: number = 1,
  limit: number = 10
): Promise<ComicCardItem[]> {
  try {
    const komikindoPage = Math.floor(((page - 1) * limit) / 40) + 1;
    const pageOffset = ((page - 1) * limit) % 40;

    let path = 'komik-terbaru';
    if (type === 'manhwa') path = 'manhwa';
    else if (type === 'manga') path = 'manga';
    else if (type === 'manhua') path = 'manhua';

    const url = komikindoPage > 1
      ? `${KOMIKINDO_BASE}/${path}/page/${komikindoPage}/`
      : `${KOMIKINDO_BASE}/${path}/`;

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 60 },
    });

    if (!res.ok) return [];
    const html = await res.text();
    const all = parseKomikindoLatestUpdates(html);
    return all.slice(pageOffset, pageOffset + limit);
  } catch (e) {
    console.error('fetchKomikindoLatest error:', e);
    return [];
  }
}

export function parseKomikindoDetail(html: string, slug: string): ComicDetail | null {
  try {
    // Title
    let title = '';
    const titleMatch = html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
                       html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/<[^>]+>/g, '').replace(/^Komik\s+/i, '').trim();
    } else {
      title = slug;
    }

    // Cover with fallback to data-src and logo rejection
    const coverMatches = [...html.matchAll(/<div class="thumb"[^>]*>[\s\S]*?<img[^>]+(?:data-src|data-lazy-src|data-original|src)="([^"]+)"/gi)];
    let coverUrl = '';
    for (const cm of coverMatches) {
      if (isValidCoverUrl(cm[1])) {
        coverUrl = cm[1];
        break;
      }
    }

    // Description / Synopsis
    let description = 'Tidak ada sinopsis.';
    const descMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (descMatch) {
      description = descMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    // Status
    let status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled' = 'ongoing';
    const statusMatch = html.match(/<b>Status:<\/b>\s*([^<]+)/i);
    if (statusMatch && statusMatch[1].toLowerCase().includes('completed')) {
      status = 'completed';
    }

    // Type: handles both <span><b>Jenis Komik:</b> <a href="...">Manhua</a></span> and plain text
    let type: 'manga' | 'manhwa' | 'manhua' | 'other' = 'other';
    const typeMatch = html.match(/<b>Jenis Komik:<\/b>([\s\S]*?)<\/span>/i) ||
                      html.match(/class="typeflag\s+([^"]+)"/i);
    if (typeMatch) {
      const raw = typeMatch[1].replace(/<[^>]+>/g, '').toLowerCase().trim();
      if (raw.includes('manhwa')) type = 'manhwa';
      else if (raw.includes('manhua')) type = 'manhua';
      else if (raw.includes('manga')) type = 'manga';
    }

    // Author & Artist
    let author: string | undefined = undefined;
    const authorMatch = html.match(/<b>Pengarang:<\/b>\s*([^<]+)/i);
    if (authorMatch) author = authorMatch[1].trim();

    let artist: string | undefined = undefined;
    const artistMatch = html.match(/<b>Artis:<\/b>\s*([^<]+)/i);
    if (artistMatch) artist = artistMatch[1].trim();

    // Alt Titles
    const altTitles: string[] = [];
    const altMatch = html.match(/<b>Judul Alternatif:<\/b>([\s\S]*?)<\/span>/i);
    if (altMatch) {
      const rawAlts = altMatch[1].replace(/<[^>]+>/g, '').split(',').map(s => s.trim()).filter(Boolean);
      for (const a of rawAlts) {
        if (a && a !== '-' && a !== title && !altTitles.includes(a)) {
          altTitles.push(a);
        }
      }
    }

    // Genres
    const genres: string[] = [];
    const genreMatches = [...html.matchAll(/<div class="genre-info"[^>]*>([\s\S]*?)<\/div>/gi)];
    if (genreMatches[0]) {
      const aMatches = [...genreMatches[0][1].matchAll(/<a[^>]*>([^<]+)<\/a>/gi)];
      for (const gm of aMatches) {
        const g = gm[1].trim();
        if (g) genres.push(g);
      }
    }

    const safeGenres = filterSafeGenres(genres);
    if (!isSafeContent({ title, genres: safeGenres })) {
      return null;
    }

    return {
      id: `komikindo--${slug}`,
      title,
      altTitles,
      description,
      coverUrl,
      type,
      status,
      genres: safeGenres,
      isFullColor: false,
      author,
      artist,
    };
  } catch (e) {
    console.error('parseKomikindoDetail error:', e);
    return null;
  }
}

export function parseKomikindoChapters(html: string): ChapterItem[] {
  const chapters: ChapterItem[] = [];
  // Matches list items in chapter_list or bxcl
  const liMatches = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];

  for (const li of liMatches) {
    const content = li[1];
    const linkMatch = content.match(/<span class="lchx"[^>]*>[\s\S]*?<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const href = linkMatch[1];
    const rawChapterTitle = linkMatch[2].replace(/<[^>]+>/g, '').trim();

    // Extract chapter number
    const numMatch = rawChapterTitle.match(/Chapter\s+([0-9.]+)/i) || href.match(/chapter-([0-9.]+)/i);
    const chapterNum = numMatch ? numMatch[1] : '0';

    // Extract exact chapter slug from URL
    const cleanChapterSlug = href.replace(/^https?:\/\/komikindo\.ch\/?/, '').replace(/^\//, '').replace(/\/$/, '');

    // Extract publish date if present
    let publishAt = '';
    const dateMatch = content.match(/<span class="dt">([\s\S]*?)<\/span>/i);
    if (dateMatch) {
      publishAt = dateMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    chapters.push({
      id: `komikindo--${cleanChapterSlug}`,
      chapter: chapterNum,
      title: `Chapter ${chapterNum}`,
      scanlationGroup: 'Komikindo Sub Indo',
      publishAt,
      pagesCount: 0,
    });
  }

  return sortChapters(deduplicateChapters(chapters), false);
}

export function parseKomikindoImages(html: string): ChapterPageItem[] {
  const chimgMatch = html.match(/<div[^>]*id="chimg-auh"[^>]*>([\s\S]*?)<\/div>/i);
  const landmineMatch = html.match(/<div[^>]*class="[^"]*img-landmine[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const readerMatch = html.match(/<div[^>]*id="readerarea"[^>]*>([\s\S]*?)<\/div>/i);

  const targetArea = chimgMatch ? chimgMatch[1] : (landmineMatch ? landmineMatch[1] : (readerMatch ? readerMatch[1] : html));

  const imgMatches = [...targetArea.matchAll(/<img[^>]+(?:data-src|data-lazy-src|src)="([^"]+)"/gi)];
  const urls: string[] = [];

  for (const m of imgMatches) {
    const src = m[1];
    if (
      src &&
      src.startsWith('http') &&
      !src.endsWith('.gif') &&
      !src.includes('.gif?') &&
      !src.includes('fav.png') &&
      !src.includes('komikindo-') &&
      !src.includes('iklan') &&
      !src.includes('promosi') &&
      !src.includes('logo') &&
      !src.includes('banner')
    ) {
      urls.push(src.replace(/^http:\/\//i, 'https://'));
    }
  }

  return urls.map(u => ({
    url: u,
    fallbackUrl: `/api/image-proxy?url=${encodeURIComponent(u)}`,
  }));
}

export async function searchKomikindo(query: string): Promise<ComicCardItem[]> {
  try {
    const res = await fetch(`${KOMIKINDO_BASE}/?s=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const html = await res.text();
    return parseKomikindoSearchResults(html);
  } catch (e) {
    console.error('searchKomikindo error:', e);
    return [];
  }
}

export async function fetchKomikindoDetail(slug: string): Promise<ComicDetail | null> {
  try {
    const res = await fetch(`${KOMIKINDO_BASE}/komik/${slug}/`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return parseKomikindoDetail(html, slug);
  } catch (e) {
    console.error('fetchKomikindoDetail error:', e);
    return null;
  }
}

export async function fetchKomikindoChapters(slug: string): Promise<ChapterItem[]> {
  try {
    const res = await fetch(`${KOMIKINDO_BASE}/komik/${slug}/`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const html = await res.text();
    return parseKomikindoChapters(html);
  } catch (e) {
    console.error('fetchKomikindoChapters error:', e);
    return [];
  }
}

export async function fetchKomikindoChapterImages(chapterSlug: string): Promise<ChapterPageItem[]> {
  try {
    let cleanSlug = chapterSlug.replace(/^komikindo--/, '').replace(/^\//, '').replace(/\/$/, '');
    const url = `${KOMIKINDO_BASE}/${cleanSlug}/`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const html = await res.text();
    return parseKomikindoImages(html);
  } catch (e) {
    console.error('fetchKomikindoChapterImages error:', e);
    return [];
  }
}

const SLUG_CACHE_TTL_MS = 15 * 60 * 1000;
const komikindoSlugCache = new Map<string, { slug: string | null; exp: number }>();

export async function findKomikindoSlug(title: string, altTitles?: string[]): Promise<string | null> {
  const cacheKey = `${title.toLowerCase()}_${(altTitles || []).join('_').toLowerCase()}`;
  const cached = komikindoSlugCache.get(cacheKey);
  if (cached && cached.exp > Date.now()) {
    return cached.slug;
  }

  const titlesToTry = generateSearchQueries(title, altTitles);
  const targets = [title, ...(altTitles || [])].filter(Boolean);
  let bestSlug: string | null = null;
  let highestScore = 0;

  for (const t of titlesToTry.slice(0, 10)) {
    try {
      const results = await searchKomikindo(t);
      if (!results || results.length === 0) continue;

      for (const card of results) {
        for (const target of targets) {
          const score = scoreTitleMatch(target, card.title);
          if (score === 100) {
            const exactSlug = card.id.replace(/^komikindo--/, '');
            komikindoSlugCache.set(cacheKey, { slug: exactSlug, exp: Date.now() + SLUG_CACHE_TTL_MS });
            return exactSlug;
          }
          if (score > highestScore && score >= 60) {
            highestScore = score;
            bestSlug = card.id.replace(/^komikindo--/, '');
          }
        }
      }

      if (highestScore >= 80 && bestSlug) {
        komikindoSlugCache.set(cacheKey, { slug: bestSlug, exp: Date.now() + SLUG_CACHE_TTL_MS });
        return bestSlug;
      }
    } catch (e) {
      console.error('findKomikindoSlug error:', e);
    }
  }

  komikindoSlugCache.set(cacheKey, { slug: bestSlug, exp: Date.now() + SLUG_CACHE_TTL_MS });
  return bestSlug;
}
