import { ChapterItem, ComicCardItem, ComicDetail, FilterOptions } from './types';
import { sortChapters, searchComics } from './mangadex';
import { normalizeTitle, searchKomiku, scoreTitleMatch } from './komiku';
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
  return 4; // MangaDex or other
}

export function mergeAndSortChapters(
  ...chapterArrays: ChapterItem[][]
): ChapterItem[] {
  const all = chapterArrays.flat();
  const map = new Map<string, ChapterItem>();

  for (const item of all) {
    const key = item.chapter.trim();
    const existing = map.get(key);

    if (!existing) {
      map.set(key, item);
      continue;
    }

    const itemDate = parseDateScore(item.publishAt);
    const existingDate = parseDateScore(existing.publishAt);

    if (itemDate > 0 && existingDate > 0) {
      if (itemDate > existingDate) {
        map.set(key, item);
      } else if (itemDate === existingDate) {
        // Tie-break by provider priority: Komiku (1) > Komikindo (2) > MangaDex (3)
        if (getProviderPriority(item.id) < getProviderPriority(existing.id)) {
          map.set(key, item);
        }
      }
    } else if (itemDate > 0 && existingDate === 0) {
      map.set(key, item);
    } else if (itemDate === 0 && existingDate === 0) {
      // Tie-break by provider priority
      if (getProviderPriority(item.id) < getProviderPriority(existing.id)) {
        map.set(key, item);
      }
    }
  }

  return sortChapters(Array.from(map.values()), false);
}

export function deduplicateComics(comics: ComicCardItem[]): ComicCardItem[] {
  const list: ComicCardItem[] = [];
  const titleToComic = new Map<string, ComicCardItem>();

  for (const c of comics) {
    const normTitle = normalizeTitle(c.title);
    const normAlt = c.altTitle ? normalizeTitle(c.altTitle) : '';

    // Check if matching an existing comic by title or altTitle
    const existing = (normTitle && titleToComic.get(normTitle)) ||
                     (normAlt && titleToComic.get(normAlt));

    if (!existing) {
      list.push(c);
      if (normTitle) titleToComic.set(normTitle, c);
      if (normAlt) titleToComic.set(normAlt, c);
      continue;
    }

    // Determine best title & altTitle
    let preferredTitle = existing.title;
    let preferredAltTitle = existing.altTitle || c.altTitle;

    // If existing's title matched c's altTitle, c.title is the primary English title
    if (normAlt && normalizeTitle(existing.title) === normAlt && c.title) {
      preferredTitle = c.title;
      preferredAltTitle = existing.title;
    } else if (normTitle && existing.altTitle && normalizeTitle(existing.altTitle) === normTitle) {
      // c.title matched existing's altTitle; keep existing.title as primary
      preferredTitle = existing.title;
      preferredAltTitle = c.title;
    } else if (c.altTitle && !existing.altTitle) {
      preferredAltTitle = c.altTitle;
    } else if (!existing.altTitle && c.title !== existing.title) {
      preferredAltTitle = c.title;
    }

    // Provider priority: Komiku (1) > Komikindo (2) > MangaDex (3)
    if (getProviderPriority(c.id) < getProviderPriority(existing.id)) {
      existing.id = c.id;
      if (c.coverUrl) existing.coverUrl = c.coverUrl;
      if (c.type && c.type !== 'other') existing.type = c.type;
      if (c.latestChapter) existing.latestChapter = c.latestChapter;
      if (c.isFullColor !== undefined) existing.isFullColor = c.isFullColor;
    }

    existing.title = preferredTitle;
    existing.altTitle = preferredAltTitle && preferredAltTitle !== preferredTitle ? preferredAltTitle : undefined;

    // Re-index all variants to point to existing
    if (normTitle) titleToComic.set(normTitle, existing);
    if (normAlt) titleToComic.set(normAlt, existing);
    const newNormTitle = normalizeTitle(existing.title);
    if (newNormTitle) titleToComic.set(newNormTitle, existing);
    if (existing.altTitle) {
      const newNormAlt = normalizeTitle(existing.altTitle);
      if (newNormAlt) titleToComic.set(newNormAlt, existing);
    }
  }

  return list;
}

export async function searchComicsUnified(
  query: string,
  options?: FilterOptions
): Promise<ComicCardItem[]> {
  const cleanQuery = (query || '').trim();

  // If query is empty, browse using MangaDex with tag/genre filters
  if (!cleanQuery) {
    return await searchComics('', options);
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

  const mdPromise = searchComics(cleanQuery, options).catch(() => []);

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

export async function fetchUnifiedComicDetail(id: string): Promise<ComicDetail | null> {
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
    if (isBrowser) {
      const res = await fetch(`/api/komikindo?action=detail&slug=${encodeURIComponent(slug)}`);
      if (res.ok) {
        const json = await res.json();
        return json.detail || null;
      }
    } else {
      const { fetchKomikindoDetail } = await import('./komikindo');
      return await fetchKomikindoDetail(slug);
    }
    return null;
  }

  if (decodedId.startsWith('softkomik--')) {
    const slug = decodedId.replace(/^softkomik--/, '');
    if (isBrowser) {
      const res = await fetch(`/api/softkomik?action=detail&slug=${encodeURIComponent(slug)}`);
      if (res.ok) {
        const json = await res.json();
        return json.detail || null;
      }
    } else {
      const { fetchSoftkomikDetail } = await import('./softkomik');
      return await fetchSoftkomikDetail(slug);
    }
    return null;
  }

  // MangaDex UUID
  const { fetchComicDetail } = await import('./mangadex');
  return await fetchComicDetail(decodedId);
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
      : import('./komiku').then(m => m.fetchKomikuChapters(slug));
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
      : import('./komiku').then(async m => {
          const s = await m.findKomikuSlug(comic.title, comic.altTitles);
          return s ? await m.fetchKomikuChapters(s) : [];
        });
  }

  // 2. If it's a Komikindo comic directly
  if (id.startsWith('komikindo--')) {
    const slug = id.replace(/^komikindo--/, '');
    komikindoPromise = isBrowser
      ? fetch(`/api/komikindo?action=chapters&slug=${encodeURIComponent(slug)}`)
          .then(r => r.ok ? r.json() : { chapters: [] })
          .then(d => d.chapters || [])
          .catch(() => [])
      : import('./komikindo').then(m => m.fetchKomikindoChapters(slug));
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
      : import('./komikindo').then(async m => {
          const s = await m.findKomikindoSlug(comic.title, comic.altTitles);
          return s ? await m.fetchKomikindoChapters(s) : [];
        });
  }

  // 3. If it's a Softkomik comic directly
  if (id.startsWith('softkomik--')) {
    const slug = id.replace(/^softkomik--/, '');
    softkomikPromise = isBrowser
      ? fetch(`/api/softkomik?action=chapters&slug=${encodeURIComponent(slug)}`)
          .then(r => r.ok ? r.json() : { chapters: [] })
          .then(d => d.chapters || [])
          .catch(() => [])
      : import('./softkomik').then(m => m.fetchSoftkomikChapters(slug));
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
      : import('./softkomik').then(async m => {
          const s = await m.findSoftkomikSlug(comic.title, comic.altTitles);
          return s ? await m.fetchSoftkomikChapters(s) : [];
        });
  }

  // 4. MangaDex: fetch chapters directly if MangaDex UUID, or resolve MangaDex ID by title
  const isDirectMangaDex = !id.startsWith('komiku--') && !id.startsWith('komikindo--') && !id.startsWith('softkomik--');
  if (isDirectMangaDex) {
    const { fetchComicChapters } = await import('./mangadex');
    mdIdPromise = fetchComicChapters(id, 'id').catch(() => []);
    mdEnPromise = fetchComicChapters(id, 'en').catch(() => []);
  } else {
    // Attempt to discover MangaDex UUID by title to provide English chapters
    mdEnPromise = (async () => {
      try {
        const { searchComics, fetchComicChapters } = await import('./mangadex');
        const matches = await searchComics(comic.title, { limit: 5 }).catch(() => []);
        const bestMatch = matches.find(m => scoreTitleMatch(comic.title, m.title) >= 70);
        if (bestMatch && !bestMatch.id.includes('--')) {
          return await fetchComicChapters(bestMatch.id, 'en').catch(() => []);
        }
      } catch {
        // ignore
      }
      return [];
    })();
  }

  const [komikuChaps, komikindoChaps, softkomikChaps, mdIdChaps, mdEnChaps] = await Promise.all([
    komikuPromise,
    komikindoPromise,
    softkomikPromise,
    mdIdPromise,
    mdEnPromise,
  ]);

  const idChapters = mergeAndSortChapters(komikuChaps, komikindoChaps, softkomikChaps, mdIdChaps);

  return {
    idChapters,
    enChapters: mdEnChaps,
  };
}
