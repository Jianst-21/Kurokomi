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

export function normalizeChapterKey(ch: string): string {
  const clean = (ch || '').trim().replace(/^ch(?:\.|apter)?\s*/i, '');
  const num = parseFloat(clean);
  if (!isNaN(num)) {
    return String(num);
  }
  return clean.toLowerCase().replace(/^0+/, '') || '0';
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
        // Tie-break by provider priority: Komiku (1) > Komikindo (2) > Softkomik (3) > MangaDex (4)
        if (getProviderPriority(item.id) < getProviderPriority(existing.id)) {
          map.set(key, { ...item, chapter: key });
        }
      }
    } else if (itemDate > 0 && existingDate === 0) {
      map.set(key, { ...item, chapter: key });
    } else if (itemDate === 0 && existingDate === 0) {
      // Tie-break by provider priority
      if (getProviderPriority(item.id) < getProviderPriority(existing.id)) {
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
  let resultCover = existing.coverUrl;
  let resultType = existing.type;
  let resultLatestChapter = existing.latestChapter;
  let resultIsFullColor = existing.isFullColor;
  let resultUpdatedAt = existing.updatedAt;

  if (getProviderPriority(incoming.id) < getProviderPriority(existing.id)) {
    resultId = incoming.id;
    if (incoming.coverUrl) resultCover = incoming.coverUrl;
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
    genres: existing.genres || incoming.genres,
  };
}

export function deduplicateComics(comics: ComicCardItem[]): ComicCardItem[] {
  interface Cluster {
    item: ComicCardItem;
    aliases: Set<string>;
  }

  const clusters: Cluster[] = [];

  for (const c of comics) {
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

  return clusters.map(cl => cl.item);
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
  ];

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

async function enrichDetailGenres(detail: ComicDetail | null): Promise<ComicDetail | null> {
  if (!detail) return null;
  if (!detail.genres || detail.genres.length === 0) {
    try {
      const mdMatches = await mangadex.searchComics(detail.title, { limit: 3 }).catch(() => []);
      const matched = mdMatches.find(m => m.genres && m.genres.length > 0);
      if (matched && matched.genres) {
        detail.genres = matched.genres;
      }
    } catch {
      // ignore
    }
  }
  return detail;
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
      const { findKomikindoSlug, fetchKomikindoDetail } = await import('./komikindo');
      const kiSlug = await findKomikindoSlug(slug);
      if (kiSlug) {
        detail = isBrowser
          ? await fetch(`/api/komikindo?action=detail&slug=${encodeURIComponent(kiSlug)}`).then(r => r.json()).then(d => d.detail).catch(() => null)
          : await fetchKomikindoDetail(kiSlug);
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

    // Resilient fallback if Komikindo 404s/fails: fallback to Softkomik
    try {
      const { findSoftkomikSlug, fetchSoftkomikDetail } = await import('./softkomik');
      const skSlug = await findSoftkomikSlug(slug);
      if (skSlug) {
        detail = isBrowser
          ? await fetch(`/api/softkomik?action=detail&slug=${encodeURIComponent(skSlug)}`).then(r => r.json()).then(d => d.detail).catch(() => null)
          : await fetchSoftkomikDetail(skSlug);
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
      const { findKomikindoSlug, fetchKomikindoDetail } = await import('./komikindo');
      const kiSlug = await findKomikindoSlug(slug);
      if (kiSlug) {
        detail = isBrowser
          ? await fetch(`/api/komikindo?action=detail&slug=${encodeURIComponent(kiSlug)}`).then(r => r.json()).then(d => d.detail).catch(() => null)
          : await fetchKomikindoDetail(kiSlug);
        if (detail) return detail;
      }
    } catch {
      // ignore
    }

    return null;
  }

  // MangaDex UUID
  const { fetchComicDetail } = await import('./mangadex');
  return await fetchComicDetail(decodedId);
}

export async function fetchUnifiedComicDetail(id: string): Promise<ComicDetail | null> {
  const detail = await resolveBaseComicDetail(id);
  return await enrichDetailGenres(detail);
}

export async function fetchUnifiedChapters(comic: ComicDetail): Promise<{
  idChapters: ChapterItem[];
  enChapters: ChapterItem[];
}> {
  const isBrowser = isClientBrowser();
  const id = comic.id;

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
      const { findMangaPillPath, fetchMangaPillChapters } = await import('./mangapill');
      const mpPath = await findMangaPillPath(comic.title, comic.altTitles);
      if (mpPath) {
        if (isBrowser) {
          const res = await fetch(`/api/mangapill?action=chapters&path=${encodeURIComponent(mpPath)}`);
          if (res.ok) {
            const data = await res.json();
            return data.chapters || [];
          }
        } else {
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

  return {
    idChapters,
    enChapters,
  };
}
