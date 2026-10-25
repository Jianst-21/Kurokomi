import { ChapterItem, ComicCardItem, ComicDetail, FilterOptions } from './types';
import { sortChapters, searchComics } from './mangadex';
import { normalizeTitle, searchKomiku } from './komiku';
import { searchKomikindo } from './komikindo';

function getProviderPriority(id: string): number {
  if (id.startsWith('komiku--')) return 1;
  if (id.startsWith('komikindo--')) return 2;
  return 3; // MangaDex or other
}

function parseDateScore(dateStr?: string): number {
  if (!dateStr) return 0;
  // Try direct date parse
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.getTime();

  // Try parsing Indonesian relative date, e.g. "5 hari lalu"
  const rel = dateStr.match(/^(\d+)\s+(detik|menit|jam|hari|minggu|bulan|tahun)\s+(yang\s+)?lalu/i);
  if (rel) {
    const num = parseInt(rel[1], 10);
    const unit = rel[2].toLowerCase();
    const now = Date.now();
    let ms = 0;
    if (unit === 'detik') ms = num * 1000;
    else if (unit === 'menit') ms = num * 60 * 1000;
    else if (unit === 'jam') ms = num * 3600 * 1000;
    else if (unit === 'hari') ms = num * 86400 * 1000;
    else if (unit === 'minggu') ms = num * 7 * 86400 * 1000;
    else if (unit === 'bulan') ms = num * 30 * 86400 * 1000;
    else if (unit === 'tahun') ms = num * 365 * 86400 * 1000;
    return now - ms;
  }

  // Try parsing DD/MM/YYYY
  const dmy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) {
    return new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10)).getTime();
  }

  return 0;
}

export function mergeAndSortChapters(
  chaptersA: ChapterItem[] = [],
  chaptersB: ChapterItem[] = [],
  chaptersC: ChapterItem[] = []
): ChapterItem[] {
  const all = [...chaptersA, ...chaptersB, ...chaptersC];
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
  const map = new Map<string, ComicCardItem>();

  for (const c of comics) {
    const norm = normalizeTitle(c.title);
    const key = norm || c.id;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, c);
    } else {
      // Prioritize Komiku (1) > Komikindo (2) > MangaDex (3)
      if (getProviderPriority(c.id) < getProviderPriority(existing.id)) {
        map.set(key, c);
      }
    }
  }

  return Array.from(map.values());
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

  const mdPromise = searchComics(cleanQuery, options).catch(() => []);

  const [komikuRes, komikindoRes, mdRes] = await Promise.all([
    komikuPromise,
    komikindoPromise,
    mdPromise,
  ]);

  let combined = [...(komikuRes || []), ...(komikindoRes || []), ...(mdRes || [])];

  // Apply comic type filtering if specified
  if (options?.type && options.type !== 'all') {
    combined = combined.filter(c => c.type === options.type);
  }

  return deduplicateComics(combined);
}

export async function fetchUnifiedComicDetail(id: string): Promise<ComicDetail | null> {
  const decodedId = decodeURIComponent(id);

  if (decodedId.startsWith('komiku--')) {
    const slug = decodedId.replace(/^komiku--/, '');
    if (typeof window !== 'undefined') {
      const res = await fetch(`/api/komiku?action=detail&slug=${encodeURIComponent(slug)}`);
      if (res.ok) {
        const json = await res.json();
        return json.detail || null;
      }
    } else {
      const { fetchKomikuDetail } = await import('./komiku');
      return await fetchKomikuDetail(slug);
    }
    return null;
  }

  if (decodedId.startsWith('komikindo--')) {
    const slug = decodedId.replace(/^komikindo--/, '');
    if (typeof window !== 'undefined') {
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

  // MangaDex UUID
  const { fetchComicDetail } = await import('./mangadex');
  return await fetchComicDetail(decodedId);
}

export async function fetchUnifiedChapters(comic: ComicDetail): Promise<{
  idChapters: ChapterItem[];
  enChapters: ChapterItem[];
}> {
  const isBrowser = typeof window !== 'undefined';
  const id = comic.id;

  let komikuPromise: Promise<ChapterItem[]> = Promise.resolve([]);
  let komikindoPromise: Promise<ChapterItem[]> = Promise.resolve([]);
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
    const altParam = (comic.altTitles || []).slice(0, 5).join('|');
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
    const altParam = (comic.altTitles || []).slice(0, 5).join('|');
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

  // 3. If it's a MangaDex UUID, fetch its chapters too
  if (!id.startsWith('komiku--') && !id.startsWith('komikindo--')) {
    const { fetchComicChapters } = await import('./mangadex');
    mdIdPromise = fetchComicChapters(id, 'id');
    mdEnPromise = fetchComicChapters(id, 'en');
  }

  const [komikuChaps, komikindoChaps, mdIdChaps, mdEnChaps] = await Promise.all([
    komikuPromise,
    komikindoPromise,
    mdIdPromise,
    mdEnPromise,
  ]);

  const idChapters = mergeAndSortChapters(komikuChaps, komikindoChaps, mdIdChaps);

  return {
    idChapters,
    enChapters: mdEnChaps,
  };
}
