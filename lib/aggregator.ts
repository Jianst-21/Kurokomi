import { ChapterItem, ComicCardItem, ComicDetail, FilterOptions } from './types';
import * as mangadex from './mangadex';
import * as komiku from './komiku';
import * as komikindo from './komikindo';
import * as softkomik from './softkomik';
import { sortChapters } from './mangadex';
import { normalizeTitle, searchKomiku, scoreTitleMatch, generateSearchQueries } from './komiku';
import { searchKomikindo } from './komikindo';
import { searchSoftkomik } from './softkomik';
import { parseDateScore } from './date';
import { isSafeContent, filterSafeGenres } from './security';

function isClientBrowser(): boolean {
  return typeof window !== 'undefined' && !process.env.VITEST;
}

function getProviderPriority(id: string): number {
  if (id.startsWith('komiku--')) return 1;
  if (id.startsWith('komikindo--')) return 2;
  if (id.startsWith('softkomik--')) return 3;
  if (id.startsWith('mangapill--')) return 4;
  return 5; // MangaDex or other
}

function getChapterProviderPriority(id: string): number {
  if (id.startsWith('softkomik--')) return 1;
  if (id.startsWith('komikindo--')) return 2;
  if (id.startsWith('komiku--')) return 3;
  if (id.startsWith('mangapill--')) return 4;
  return 5; // MangaDex or other
}

/**
 * Evaluates the quality and aesthetic completeness of a cover poster.
 * Komiku full poster thumbnails and Komikindo full posters are full-body/comic-cover compositions,
 * whereas cropped webp heads (like some softkomik crops) score lower.
 */
function getCoverQualityScore(coverUrl?: string, providerId?: string): number {
  if (!coverUrl) return 0;
  let score = 10;
  const lower = coverUrl.toLowerCase();

  // Severe penalty for landscape/horizontal banners (e.g. manga_img_horizontal, 450x235)
  // These look terribly zoomed when placed into vertical portrait 3:4 cards.
  if (
    lower.includes('horizontal') ||
    lower.includes('resize=450,235') ||
    lower.includes('manga_img_horizontal') ||
    lower.includes('resize=30,18')
  ) {
    return 1;
  }

  // Komiku high-resolution vertical poster (manga_thumbnail or detail covers)
  if (
    (lower.includes('thumbnail.komiku') || lower.includes('komiku.to') || lower.includes('komiku.org')) &&
    (lower.includes('manga_thumbnail') || lower.includes('/new/img/') || lower.includes('img_68'))
  ) {
    score += 50;
  }
  // Komikindo vertical series masterimage (usually 236x316 or full portrait)
  else if (lower.includes('komikindo') || lower.includes('masterimage-series')) {
    score += 40;
  }
  // Softkomik full cover image
  else if (lower.includes('softdevices.my.id') || lower.includes('softkomik-cover')) {
    if (lower.includes('image-cover')) {
      score += 35;
    } else {
      score += 20;
    }
  }

  // Bonus if provider matches high priority
  if (providerId) {
    const priority = getProviderPriority(providerId);
    score += (5 - priority) * 5;
  }

  return score;
}

function pickPreferredCover(
  coverA: string | undefined,
  idA: string | undefined,
  coverB: string | undefined,
  idB: string | undefined
): string {
  if (!coverA && !coverB) return '';
  if (!coverA) return coverB!;
  if (!coverB) return coverA;

  const scoreA = getCoverQualityScore(coverA, idA);
  const scoreB = getCoverQualityScore(coverB, idB);

  return scoreB > scoreA ? coverB : coverA;
}

export function normalizeChapterKey(ch: string): string {
  const clean = (ch || '').trim().replace(/^ch(?:\.|apter)?\s*/i, '');
  const num = parseFloat(clean);
  if (!isNaN(num)) {
    return String(num);
  }
  return clean.toLowerCase().replace(/^0+/, '') || '0';
}

export function extractChapterNumber(chapterId: string): string | null {
  if (!chapterId) return null;
  const decoded = decodeURIComponent(chapterId).trim();

  // Guard: standard UUID format is an opaque ID (e.g. MangaDex), not a chapter slug
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded)) {
    return null;
  }

  // Softkomik pattern: softkomik--slug__<chapter>
  const softkomikMatch = decoded.match(/__([0-9.]+)(?:[?&#]|$)/);
  if (softkomikMatch) {
    return normalizeChapterKey(softkomikMatch[1]);
  }

  // Common pattern: chapter-123, ch-123, ch.123, c-123 (with optional suffix like -bahasa-indonesia or -indo)
  const chMatch = decoded.match(/(?:^|[-_/])(?:chapter|ch|chap)[-.]?([0-9.]+)/i);
  if (chMatch) {
    return normalizeChapterKey(chMatch[1]);
  }

  // Fallback pattern: -c-123 or /c-123
  const cDashMatch = decoded.match(/(?:^|[-_/])c-([0-9.]+)/i);
  if (cDashMatch) {
    return normalizeChapterKey(cDashMatch[1]);
  }

  // Trailing digits pattern: e.g. slug-123 or slug_123
  const endNumMatch = decoded.match(/[-_]([0-9.]+)$/);
  if (endNumMatch) {
    return normalizeChapterKey(endNumMatch[1]);
  }

  return null;
}

export function findChapterMatch(chapters: ChapterItem[], chapterId: string): ChapterItem | null {
  if (!chapters || chapters.length === 0 || !chapterId) return null;
  const decodedId = decodeURIComponent(chapterId);

  // 1. Exact ID match (raw or decoded)
  const exact = chapters.find(c => c.id === chapterId || decodeURIComponent(c.id) === decodedId);
  if (exact) return exact;

  // 2. Number-based match
  const extractedNum = extractChapterNumber(chapterId);
  if (extractedNum) {
    const normTarget = normalizeChapterKey(extractedNum);
    const byNum = chapters.find(c => normalizeChapterKey(c.chapter) === normTarget);
    if (byNum) return byNum;
  }

  return null;
}

export function mergeAndSortChapters(
  ...chapterArrays: ChapterItem[][]
): ChapterItem[] {
  const all = chapterArrays.flat();
  const map = new Map<string, ChapterItem>();

  for (const item of all) {
    const key = normalizeChapterKey(item.chapter);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, { ...item, chapter: key });
      continue;
    }

    const itemDate = parseDateScore(item.publishAt);
    const existingDate = parseDateScore(existing.publishAt);

    if (itemDate > 0 && existingDate > 0) {
      if (itemDate > existingDate) {
        map.set(key, { ...item, chapter: key });
      } else if (itemDate === existingDate) {
        // Tie-break by chapter provider priority: Softkomik (1) > Komikindo (2) > Komiku (3) > MangaDex (4)
        if (getChapterProviderPriority(item.id) < getChapterProviderPriority(existing.id)) {
          map.set(key, { ...item, chapter: key });
        }
      }
    } else if (itemDate > 0 && existingDate === 0) {
      map.set(key, { ...item, chapter: key });
    } else if (itemDate === 0 && existingDate === 0) {
      // Tie-break by chapter provider priority
      if (getChapterProviderPriority(item.id) < getChapterProviderPriority(existing.id)) {
        map.set(key, { ...item, chapter: key });
      }
    }
  }

  return sortChapters(Array.from(map.values()), false);
}

function cleanComicAlias(t: string): string {
  const norm = normalizeTitle(t);
  return norm
    .replace(/^komik\s+/i, '')
    .replace(/^manga\s+/i, '')
    .replace(/^manhwa\s+/i, '')
    .replace(/^manhua\s+/i, '')
    .replace(/\s*(?:bahasa\s+indonesia|sub\s+indo|indonesia|indo)$/i, '')
    .replace(/\s*(?:colored|fan\s+colored|full\s+color|color\s+version|berwarna)$/i, '')
    .replace(/\s*(?:tamat|end|batch)$/i, '')
    .replace(/\s*(?:season\s+\d+|s\d+)$/i, '')
    .trim();
}

function getSlugAlias(id: string): string | null {
  if (id.startsWith('komiku--') || id.startsWith('komikindo--') || id.startsWith('softkomik--')) {
    const raw = id.replace(/^(komiku|komikindo|softkomik)--/, '');
    const cleanSlug = raw
      .replace(/-(?:bahasa-indonesia|sub-indo)$/i, '')
      .replace(/__.*$/, '')
      .replace(/-/g, ' ');
    return cleanComicAlias(cleanSlug);
  }
  return null;
}

function mergeTwoComicItems(existing: ComicCardItem, incoming: ComicCardItem): ComicCardItem {
  const normExistingTitle = normalizeTitle(existing.title);
  const normIncomingTitle = normalizeTitle(incoming.title);
  const normExistingAlt = existing.altTitle ? normalizeTitle(existing.altTitle) : '';
  const normIncomingAlt = incoming.altTitle ? normalizeTitle(incoming.altTitle) : '';

  let preferredTitle = existing.title;
  let preferredAltTitle = existing.altTitle || incoming.altTitle;

  // If existing's title matched incoming's altTitle, incoming.title is the primary English/popular title
  if (normIncomingAlt && normExistingTitle === normIncomingAlt && incoming.title) {
    preferredTitle = incoming.title;
    preferredAltTitle = existing.title;
  } else if (normIncomingTitle && normExistingAlt === normIncomingTitle) {
    preferredTitle = existing.title;
    preferredAltTitle = incoming.title;
  } else if (incoming.altTitle && !existing.altTitle) {
    preferredAltTitle = incoming.altTitle;
  } else if (!existing.altTitle && incoming.title !== existing.title && normIncomingTitle !== normExistingTitle) {
    preferredAltTitle = incoming.title;
  }

  // Provider priority: Komiku (1) > Komikindo (2) > Softkomik (3) > MangaDex (4)
  let resultId = existing.id;
  let resultCover = pickPreferredCover(existing.coverUrl, existing.id, incoming.coverUrl, incoming.id);
  let resultType = existing.type;
  let resultLatestChapter = existing.latestChapter;
  let resultIsFullColor = existing.isFullColor;
  let resultUpdatedAt = existing.updatedAt;

  if (getProviderPriority(incoming.id) < getProviderPriority(existing.id)) {
    resultId = incoming.id;
    if (incoming.type && incoming.type !== 'other') resultType = incoming.type;
    if (incoming.latestChapter) resultLatestChapter = incoming.latestChapter;
    if (incoming.isFullColor !== undefined) resultIsFullColor = incoming.isFullColor;
    if (incoming.updatedAt) resultUpdatedAt = incoming.updatedAt;
  }

  // If altTitle equals title after normalization, omit it
  if (preferredAltTitle && normalizeTitle(preferredAltTitle) === normalizeTitle(preferredTitle)) {
    preferredAltTitle = undefined;
  }

  // Combine unique altTitles
  const combinedAltTitles = Array.from(new Set([
    ...(existing.altTitles || []),
    ...(incoming.altTitles || []),
  ].filter(Boolean)));

  return {
    id: resultId,
    title: preferredTitle,
    altTitle: preferredAltTitle,
    altTitles: combinedAltTitles.length > 0 ? combinedAltTitles : undefined,
    coverUrl: resultCover,
    type: resultType,
    latestChapter: resultLatestChapter,
    updatedAt: resultUpdatedAt,
    isFullColor: resultIsFullColor,
    genres: filterSafeGenres(existing.genres || incoming.genres),
  };
}

function parseChapterNumber(chStr?: string): number {
  if (!chStr) return 0;
  const clean = chStr.replace(/[^0-9.]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

export function mergeLatestComics(
  sources: ComicCardItem[][],
  userFavorites: ComicCardItem[] = []
): ComicCardItem[] {
  const allItems = sources.flat().filter(isSafeContent);

  // Group by alias
  interface Cluster {
    item: ComicCardItem;
    aliases: Set<string>;
  }

  const clusters: Cluster[] = [];

  for (const c of allItems) {
    const rawAliases = [c.title, c.altTitle, ...(c.altTitles || [])].filter(Boolean) as string[];
    const slugAlias = getSlugAlias(c.id);
    if (slugAlias) rawAliases.push(slugAlias);

    const normAliases = new Set<string>();
    for (const a of rawAliases) {
      const norm = normalizeTitle(a);
      if (norm) normAliases.add(norm);
      const clean = cleanComicAlias(a);
      if (clean) normAliases.add(clean);
    }

    const matchingClusters: Cluster[] = [];
    const nonMatchingClusters: Cluster[] = [];

    for (const cluster of clusters) {
      let matched = false;
      for (const alias of normAliases) {
        if (cluster.aliases.has(alias)) {
          matched = true;
          break;
        }
      }
      if (matched) {
        matchingClusters.push(cluster);
      } else {
        nonMatchingClusters.push(cluster);
      }
    }

    if (matchingClusters.length === 0) {
      clusters.push({
        item: { ...c },
        aliases: normAliases,
      });
    } else {
      let base = matchingClusters[0].item;
      const combinedAliases = new Set<string>(normAliases);
      matchingClusters.forEach(mc => mc.aliases.forEach(a => combinedAliases.add(a)));

      // Compare base vs current item 'c'
      const baseChNum = parseChapterNumber(base.latestChapter);
      const incomingChNum = parseChapterNumber(c.latestChapter);
      const baseDateScore = parseDateScore(base.updatedAt);
      const incomingDateScore = parseDateScore(c.updatedAt);

      // We want to pick whichever has the higher chapter or newer update
      let winner = base;
      let loser = c;

      if (incomingChNum > baseChNum) {
        winner = c;
        loser = base;
      } else if (incomingChNum === baseChNum && incomingDateScore > baseDateScore) {
        winner = c;
        loser = base;
      }

      // Title cleanup: avoid titles ending with "Sub Indo" or raw hyphens
      let cleanTitle = winner.title;
      if (cleanTitle.toLowerCase().includes('sub indo') && loser.title && !loser.title.toLowerCase().includes('sub indo')) {
        cleanTitle = loser.title;
      }

      const mergedItem: ComicCardItem = {
        ...winner,
        title: cleanTitle,
        coverUrl: pickPreferredCover(winner.coverUrl, winner.id, loser.coverUrl, loser.id),
        altTitle: winner.altTitle || loser.altTitle,
        isFullColor: winner.isFullColor || loser.isFullColor,
        genres: filterSafeGenres(winner.genres || loser.genres),
      };

      clusters.length = 0;
      clusters.push(...nonMatchingClusters, {
        item: mergedItem,
        aliases: combinedAliases,
      });
    }
  }

  // Preserve user favorite IDs if available
  const result = clusters.map(cl => {
    const item = cl.item;
    if (userFavorites && userFavorites.length > 0) {
      const matchFav = userFavorites.find(f => {
        if (f.id === item.id) return true;
        const fNorm = cleanComicAlias(f.title);
        const itemNorm = cleanComicAlias(item.title);
        return fNorm && itemNorm && fNorm === itemNorm;
      });
      if (matchFav) {
        return {
          ...item,
          id: matchFav.id,
        };
      }
    }
    return item;
  });

  // Sort chronologically descending
  return result.sort((a, b) => {
    const scoreA = parseDateScore(a.updatedAt);
    const scoreB = parseDateScore(b.updatedAt);
    if (scoreA > 0 && scoreB > 0 && scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    return 0;
  });
}

export function deduplicateComics(comics: ComicCardItem[]): ComicCardItem[] {
  interface Cluster {
    item: ComicCardItem;
    aliases: Set<string>;
  }

  const clusters: Cluster[] = [];

  for (const c of comics.filter(isSafeContent)) {
    const rawAliases = [c.title, c.altTitle, ...(c.altTitles || [])].filter(Boolean) as string[];
    const slugAlias = getSlugAlias(c.id);
    if (slugAlias) rawAliases.push(slugAlias);

    const normAliases = new Set<string>();
    for (const a of rawAliases) {
      const norm = normalizeTitle(a);
      if (norm) normAliases.add(norm);
      const clean = cleanComicAlias(a);
      if (clean) normAliases.add(clean);
    }

    const matchingClusters: Cluster[] = [];
    const nonMatchingClusters: Cluster[] = [];

    for (const cluster of clusters) {
      let matched = false;
      for (const alias of normAliases) {
        if (cluster.aliases.has(alias)) {
          matched = true;
          break;
        }
      }
      if (matched) {
        matchingClusters.push(cluster);
      } else {
        nonMatchingClusters.push(cluster);
      }
    }

    if (matchingClusters.length === 0) {
      clusters.push({
        item: { ...c },
        aliases: normAliases,
      });
    } else {
      let mergedItem = c;
      const combinedAliases = new Set<string>(normAliases);

      for (const mc of matchingClusters) {
        mergedItem = mergeTwoComicItems(mc.item, mergedItem);
        mc.aliases.forEach(a => combinedAliases.add(a));
      }

      const finalNormTitle = normalizeTitle(mergedItem.title);
      if (finalNormTitle) combinedAliases.add(finalNormTitle);
      const finalCleanTitle = cleanComicAlias(mergedItem.title);
      if (finalCleanTitle) combinedAliases.add(finalCleanTitle);

      if (mergedItem.altTitle) {
        const finalNormAlt = normalizeTitle(mergedItem.altTitle);
        if (finalNormAlt) combinedAliases.add(finalNormAlt);
      }

      clusters.length = 0;
      clusters.push(...nonMatchingClusters, {
        item: mergedItem,
        aliases: combinedAliases,
      });
    }
  }

  return clusters.map(cl => cl.item).filter(isSafeContent);
}

export async function searchComicsUnified(
  query: string,
  options?: FilterOptions
): Promise<ComicCardItem[]> {
  const cleanQuery = (query || '').trim();

  // If query is empty, browse using MangaDex with tag/genre filters
  if (!cleanQuery) {
    return await mangadex.searchComics('', options);
  }

  const isBrowser = typeof window !== 'undefined' && !process.env.VITEST;

  const komikuPromise = isBrowser
    ? fetch(`/api/komiku?action=search&q=${encodeURIComponent(cleanQuery)}`)
        .then(r => r.ok ? r.json() : { comics: [] })
        .then(d => d.comics || [])
        .catch(() => [])
    : searchKomiku(cleanQuery).catch(() => []);

  const komikindoPromise = isBrowser
    ? fetch(`/api/komikindo?action=search&q=${encodeURIComponent(cleanQuery)}`)
        .then(r => r.ok ? r.json() : { comics: [] })
        .then(d => d.comics || [])
        .catch(() => [])
    : searchKomikindo(cleanQuery).catch(() => []);

  const softkomikPromise = isBrowser
    ? fetch(`/api/softkomik?action=search&q=${encodeURIComponent(cleanQuery)}`)
        .then(r => r.ok ? r.json() : { comics: [] })
        .then(d => d.comics || [])
        .catch(() => [])
    : searchSoftkomik(cleanQuery).catch(() => []);

  const mdPromise = mangadex.searchComics(cleanQuery, options).catch(() => []);

  const [komikuRes, komikindoRes, softkomikRes, mdRes] = await Promise.all([
    komikuPromise,
    komikindoPromise,
    softkomikPromise,
    mdPromise,
  ]);

  let combined = [
    ...(komikuRes || []),
    ...(komikindoRes || []),
    ...(softkomikRes || []),
    ...(mdRes || []),
  ].filter(isSafeContent);

  // Apply comic type filtering if specified
  if (options?.type && options.type !== 'all') {
    combined = combined.filter(c => c.type === options.type);
  }

  const deduplicated = deduplicateComics(combined);

  // Sort results by relevance to search query (exact match on main title or altTitle)
  return deduplicated.sort((a, b) => {
    const scoreA = Math.max(
      scoreTitleMatch(cleanQuery, a.title),
      a.altTitle ? scoreTitleMatch(cleanQuery, a.altTitle) : 0
    );
    const scoreB = Math.max(
      scoreTitleMatch(cleanQuery, b.title),
      b.altTitle ? scoreTitleMatch(cleanQuery, b.altTitle) : 0
    );
    return scoreB - scoreA;
  });
}

export async function enrichDetailGenres(detail: ComicDetail | null): Promise<ComicDetail | null> {
  if (!detail) return null;
  if (!detail.genres || detail.genres.length === 0) {
    try {
      // Gather search candidates: primary title first, followed by clean altTitles
      const candidates: string[] = [];
      if (detail.title && detail.title.trim()) {
        candidates.push(detail.title.trim());
      }
      if (detail.altTitles && Array.isArray(detail.altTitles)) {
        for (const alt of detail.altTitles) {
          const cleanAlt = (alt || '').trim();
          if (cleanAlt && !candidates.includes(cleanAlt)) {
            candidates.push(cleanAlt);
          }
        }
      }

      for (const query of candidates.slice(0, 4)) {
        const mdMatches = await mangadex.searchComics(query, { limit: 3 }).catch(() => []);
        const matched = mdMatches.find(m => m.genres && m.genres.length > 0);
        if (matched && matched.genres && matched.genres.length > 0) {
          detail.genres = filterSafeGenres(matched.genres);
          if (detail.genres.length > 0) break;
        }
      }
    } catch {
      // ignore
    }
  } else {
    detail.genres = filterSafeGenres(detail.genres);
  }
  return isSafeContent(detail) ? detail : null;
}

async function resolveBaseComicDetail(id: string): Promise<ComicDetail | null> {
  const decodedId = decodeURIComponent(id);
  const isBrowser = isClientBrowser();

  if (decodedId.startsWith('komiku--')) {
    const slug = decodedId.replace(/^komiku--/, '');
    let detail: ComicDetail | null = null;
    if (isBrowser) {
      const res = await fetch(`/api/komiku?action=detail&slug=${encodeURIComponent(slug)}`);
      if (res.ok) {
        const json = await res.json();
        detail = json.detail || null;
      }
    } else {
      const { fetchKomikuDetail } = await import('./komiku');
      detail = await fetchKomikuDetail(slug);
    }

    if (detail) return detail;

    // Fallback if Komiku 404s (e.g. Komiku removed the comic, fallback to Komikindo)
    try {
      let kiSlug: string | null = null;
      if (isBrowser) {
        const sr = await fetch(`/api/komikindo?action=slug&title=${encodeURIComponent(slug)}`);
        if (sr.ok) {
          const sjson = await sr.json();
          kiSlug = sjson.slug || null;
        }
      } else {
        const { findKomikindoSlug } = await import('./komikindo');
        kiSlug = await findKomikindoSlug(slug);
      }
      if (kiSlug) {
        detail = isBrowser
          ? await fetch(`/api/komikindo?action=detail&slug=${encodeURIComponent(kiSlug)}`)
              .then(r => r.ok ? r.json() : null)
              .then(d => d ? d.detail : null)
              .catch(() => null)
          : await (await import('./komikindo')).fetchKomikindoDetail(kiSlug);
        if (detail) return detail;
      }
    } catch {
      // ignore
    }

    return null;
  }

  if (decodedId.startsWith('komikindo--')) {
    const slug = decodedId.replace(/^komikindo--/, '');
    let detail: ComicDetail | null = null;
    if (isBrowser) {
      const res = await fetch(`/api/komikindo?action=detail&slug=${encodeURIComponent(slug)}`);
      if (res.ok) {
        const json = await res.json();
        detail = json.detail || null;
      }
    } else {
      const { fetchKomikindoDetail } = await import('./komikindo');
      detail = await fetchKomikindoDetail(slug);
    }
    if (detail) return detail;

    // Resilient fallback if Komikindo 404s/fails: fallback to Softkomik or Komiku
    try {
      let skSlug: string | null = null;
      if (isBrowser) {
        const sr = await fetch(`/api/softkomik?action=slug&title=${encodeURIComponent(slug)}`);
        if (sr.ok) {
          const sjson = await sr.json();
          skSlug = sjson.slug || null;
        }
      } else {
        const { findSoftkomikSlug } = await import('./softkomik');
        skSlug = await findSoftkomikSlug(slug);
      }
      if (skSlug) {
        detail = isBrowser
          ? await fetch(`/api/softkomik?action=detail&slug=${encodeURIComponent(skSlug)}`)
              .then(r => r.ok ? r.json() : null)
              .then(d => d ? d.detail : null)
              .catch(() => null)
          : await (await import('./softkomik')).fetchSoftkomikDetail(skSlug);
        if (detail) return detail;
      }
    } catch {
      // ignore
    }

    try {
      let kuSlug: string | null = null;
      if (isBrowser) {
        const sr = await fetch(`/api/komiku?action=search&title=${encodeURIComponent(slug)}&slugOnly=true`);
        if (sr.ok) {
          const sjson = await sr.json();
          kuSlug = sjson.slug || null;
        }
      } else {
        const { findKomikuSlug } = await import('./komiku');
        kuSlug = await findKomikuSlug(slug);
      }
      if (kuSlug) {
        detail = isBrowser
          ? await fetch(`/api/komiku?action=detail&slug=${encodeURIComponent(kuSlug)}`)
              .then(r => r.ok ? r.json() : null)
              .then(d => d ? d.detail : null)
              .catch(() => null)
          : await (await import('./komiku')).fetchKomikuDetail(kuSlug);
        if (detail) return detail;
      }
    } catch {
      // ignore
    }

    return null;
  }

  if (decodedId.startsWith('softkomik--')) {
    const slug = decodedId.replace(/^softkomik--/, '');
    let detail: ComicDetail | null = null;
    if (isBrowser) {
      const res = await fetch(`/api/softkomik?action=detail&slug=${encodeURIComponent(slug)}`);
      if (res.ok) {
        const json = await res.json();
        detail = json.detail || null;
      }
    } else {
      const { fetchSoftkomikDetail } = await import('./softkomik');
      detail = await fetchSoftkomikDetail(slug);
    }
    if (detail) return detail;

    // Resilient fallback if Softkomik 404s/fails: fallback to Komikindo
    try {
      let kiSlug: string | null = null;
      if (isBrowser) {
        const sr = await fetch(`/api/komikindo?action=slug&title=${encodeURIComponent(slug)}`);
        if (sr.ok) {
          const sjson = await sr.json();
          kiSlug = sjson.slug || null;
        }
      } else {
        const { findKomikindoSlug } = await import('./komikindo');
        kiSlug = await findKomikindoSlug(slug);
      }
      if (kiSlug) {
        detail = isBrowser
          ? await fetch(`/api/komikindo?action=detail&slug=${encodeURIComponent(kiSlug)}`)
              .then(r => r.ok ? r.json() : null)
              .then(d => d ? d.detail : null)
              .catch(() => null)
          : await (await import('./komikindo')).fetchKomikindoDetail(kiSlug);
        if (detail) return detail;
      }
    } catch {
      // ignore
    }

    return null;
  }

  // 4. MangaPill provider
  if (decodedId.startsWith('mangapill--')) {
    const raw = decodedId.replace(/^mangapill--/, '');
    const cleanPath = '/' + raw.replace(/___/g, '/');
    let detail: ComicDetail | null = null;
    if (isBrowser) {
      // In browser, try resolving detail or search
      const res = await fetch(`/api/mangapill?action=detail&path=${encodeURIComponent(cleanPath)}`);
      if (res.ok) {
        const json = await res.json();
        detail = json.detail || null;
      }
    } else {
      const { fetchMangaPillDetail } = await import('./mangapill');
      detail = await fetchMangaPillDetail(cleanPath);
    }
    if (detail) return detail;
    return null;
  }

  // MangaDex UUID
  const { fetchComicDetail } = await import('./mangadex');
  return await fetchComicDetail(decodedId);
}

const detailMemoryCache = new Map<string, { data: ComicDetail; exp: number }>();
const chaptersMemoryCache = new Map<string, { data: { idChapters: ChapterItem[]; enChapters: ChapterItem[] }; exp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchUnifiedComicDetail(id: string): Promise<ComicDetail | null> {
  const isBrowser = isClientBrowser();
  if (isBrowser) {
    const cached = detailMemoryCache.get(id);
    if (cached && cached.exp > Date.now()) {
      return cached.data;
    }
  }

  const detail = await resolveBaseComicDetail(id);
  const enriched = await enrichDetailGenres(detail);

  if (isBrowser && enriched) {
    detailMemoryCache.set(id, { data: enriched, exp: Date.now() + CACHE_TTL_MS });
  }

  return enriched;
}

export async function fetchUnifiedChapters(comic: ComicDetail): Promise<{
  idChapters: ChapterItem[];
  enChapters: ChapterItem[];
}> {
  const isBrowser = isClientBrowser();
  const id = comic.id;

  if (isBrowser) {
    const cached = chaptersMemoryCache.get(id);
    if (cached && cached.exp > Date.now()) {
      return cached.data;
    }
  }

  let komikuPromise: Promise<ChapterItem[]> = Promise.resolve([]);
  let komikindoPromise: Promise<ChapterItem[]> = Promise.resolve([]);
  let softkomikPromise: Promise<ChapterItem[]> = Promise.resolve([]);
  let mdIdPromise: Promise<ChapterItem[]> = Promise.resolve([]);
  let mdEnPromise: Promise<ChapterItem[]> = Promise.resolve([]);

  // 1. If it's a Komiku comic directly
  if (id.startsWith('komiku--')) {
    const slug = id.replace(/^komiku--/, '');
    komikuPromise = isBrowser
      ? fetch(`/api/komiku?action=chapters&slug=${encodeURIComponent(slug)}`)
          .then(r => r.ok ? r.json() : { chapters: [] })
          .then(d => d.chapters || [])
          .catch(() => [])
      : komiku.fetchKomikuChapters(slug).catch(() => []);
  } else {
    // Search Komiku by title + altTitles
    const altParam = (comic.altTitles || []).slice(0, 10).join('|');
    komikuPromise = isBrowser
      ? fetch(`/api/komiku?action=search&title=${encodeURIComponent(comic.title)}&altTitles=${encodeURIComponent(altParam)}&slugOnly=true`)
          .then(r => r.ok ? r.json() : { slug: null })
          .then(async d => {
            if (!d.slug) return [];
            const cr = await fetch(`/api/komiku?action=chapters&slug=${encodeURIComponent(d.slug)}`);
            if (!cr.ok) return [];
            const cjson = await cr.json();
            return cjson.chapters || [];
          })
          .catch(() => [])
      : (async () => {
          const s = await komiku.findKomikuSlug(comic.title, comic.altTitles);
          return s ? await komiku.fetchKomikuChapters(s).catch(() => []) : [];
        })();
  }

  // 2. If it's a Komikindo comic directly
  if (id.startsWith('komikindo--')) {
    const slug = id.replace(/^komikindo--/, '');
    komikindoPromise = isBrowser
      ? fetch(`/api/komikindo?action=chapters&slug=${encodeURIComponent(slug)}`)
          .then(r => r.ok ? r.json() : { chapters: [] })
          .then(d => d.chapters || [])
          .catch(() => [])
      : komikindo.fetchKomikindoChapters(slug).catch(() => []);
  } else {
    // Search Komikindo by title + altTitles
    const altParam = (comic.altTitles || []).slice(0, 10).join('|');
    komikindoPromise = isBrowser
      ? fetch(`/api/komikindo?action=search&title=${encodeURIComponent(comic.title)}&altTitles=${encodeURIComponent(altParam)}&slugOnly=true`)
          .then(r => r.ok ? r.json() : { slug: null })
          .then(async d => {
            if (!d.slug) return [];
            const cr = await fetch(`/api/komikindo?action=chapters&slug=${encodeURIComponent(d.slug)}`);
            if (!cr.ok) return [];
            const cjson = await cr.json();
            return cjson.chapters || [];
          })
          .catch(() => [])
      : (async () => {
          const s = await komikindo.findKomikindoSlug(comic.title, comic.altTitles);
          return s ? await komikindo.fetchKomikindoChapters(s).catch(() => []) : [];
        })();
  }

  // 3. If it's a Softkomik comic directly
  if (id.startsWith('softkomik--')) {
    const slug = id.replace(/^softkomik--/, '');
    softkomikPromise = isBrowser
      ? fetch(`/api/softkomik?action=chapters&slug=${encodeURIComponent(slug)}`)
          .then(r => r.ok ? r.json() : { chapters: [] })
          .then(d => d.chapters || [])
          .catch(() => [])
      : softkomik.fetchSoftkomikChapters(slug).catch(() => []);
  } else {
    // Search Softkomik by title + altTitles
    const altParam = (comic.altTitles || []).slice(0, 10).join('|');
    softkomikPromise = isBrowser
      ? fetch(`/api/softkomik?action=search&title=${encodeURIComponent(comic.title)}&altTitles=${encodeURIComponent(altParam)}&slugOnly=true`)
          .then(r => r.ok ? r.json() : { slug: null })
          .then(async d => {
            if (!d.slug) return [];
            const cr = await fetch(`/api/softkomik?action=chapters&slug=${encodeURIComponent(d.slug)}`);
            if (!cr.ok) return [];
            const cjson = await cr.json();
            return cjson.chapters || [];
          })
          .catch(() => [])
      : (async () => {
          const s = await softkomik.findSoftkomikSlug(comic.title, comic.altTitles);
          return s ? await softkomik.fetchSoftkomikChapters(s).catch(() => []) : [];
        })();
  }

  // 4. MangaDex: fetch chapters directly if MangaDex UUID, or resolve MangaDex ID by title
  const isDirectMangaDex = !id.startsWith('komiku--') && !id.startsWith('komikindo--') && !id.startsWith('softkomik--');
  if (isDirectMangaDex) {
    mdIdPromise = mangadex.fetchComicChapters(id, 'id').catch(() => []);
    mdEnPromise = mangadex.fetchComicChapters(id, 'en').catch(() => []);
  } else {
    // Attempt to discover MangaDex UUID by title + altTitles to provide English chapters
    mdEnPromise = (async () => {
      try {
        const titlesToTry = generateSearchQueries(comic.title, comic.altTitles);
        const allTargets = [comic.title, ...(comic.altTitles || [])].filter(Boolean);

        let bestMatch: ComicCardItem | null = null;
        let highestScore = 0;

        for (const q of titlesToTry.slice(0, 4)) {
          const matches = await mangadex.searchComics(q, { limit: 5 }).catch(() => []);
          for (const m of matches) {
            if (m.id.includes('--')) continue;

            for (const target of allTargets) {
              const s1 = scoreTitleMatch(target, m.title);
              const s2 = m.altTitle ? scoreTitleMatch(target, m.altTitle) : 0;
              let s3 = 0;
              for (const at of (m.altTitles || [])) {
                s3 = Math.max(s3, scoreTitleMatch(target, at));
              }
              const s = Math.max(s1, s2, s3);
              if (s > highestScore) {
                highestScore = s;
                bestMatch = m;
              }
            }
          }
          if (highestScore >= 80) break;
        }

        if (bestMatch && highestScore >= 60) {
          return await mangadex.fetchComicChapters(bestMatch.id, 'en').catch(() => []);
        }
      } catch {
        // ignore
      }
      return [];
    })();
  }

  // 5. MangaPill: Fetch English chapters from MangaPill for complete manga scanlations
  const mpEnPromise = (async (): Promise<ChapterItem[]> => {
    try {
      const altParam = (comic.altTitles || []).slice(0, 10).join('|');
      let mpPath: string | null = null;
      if (isBrowser) {
        const pathRes = await fetch(
          `/api/mangapill?action=slug&title=${encodeURIComponent(comic.title)}&altTitles=${encodeURIComponent(altParam)}&slugOnly=true`
        );
        if (pathRes.ok) {
          const pathData = await pathRes.json();
          mpPath = pathData.path || null;
        }
      } else {
        const { findMangaPillPath } = await import('./mangapill');
        mpPath = await findMangaPillPath(comic.title, comic.altTitles);
      }

      if (mpPath) {
        if (isBrowser) {
          const res = await fetch(`/api/mangapill?action=chapters&path=${encodeURIComponent(mpPath)}`);
          if (res.ok) {
            const data = await res.json();
            return data.chapters || [];
          }
        } else {
          const { fetchMangaPillChapters } = await import('./mangapill');
          return await fetchMangaPillChapters(mpPath);
        }
      }
    } catch {
      // ignore
    }
    return [];
  })();

  const [komikuChaps, komikindoChaps, softkomikChaps, mdIdChaps, mdEnChaps, mpEnChaps] = await Promise.all([
    komikuPromise,
    komikindoPromise,
    softkomikPromise,
    mdIdPromise,
    mdEnPromise,
    mpEnPromise,
  ]);

  const idChapters = mergeAndSortChapters(komikuChaps, komikindoChaps, softkomikChaps, mdIdChaps);
  const enChapters = mergeAndSortChapters(mpEnChaps, mdEnChaps);

  const result = {
    idChapters,
    enChapters,
  };

  if (isBrowser && (idChapters.length > 0 || enChapters.length > 0)) {
    chaptersMemoryCache.set(id, { data: result, exp: Date.now() + CACHE_TTL_MS });
  }

  return result;
}
