import {
  ComicCardItem,
  ComicDetail,
  ChapterItem,
  ChapterPageItem,
  FilterOptions,
  ComicType,
} from './types';

export const MANGADEX_API_BASE = 'https://api.mangadex.org';
export const MANGADEX_COVER_BASE = 'https://uploads.mangadex.org/covers';

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    return '/api/mangadex';
  }
  return MANGADEX_API_BASE;
}

export const FULL_COLOR_TAG_ID = 'f4122d1c-3b44-44d0-9936-ff7502c39ad3';

export const GENRE_TAG_IDS: Record<string, string> = {
  action: '391b0423-d847-456f-aff0-8b0cfc03066b',
  adventure: '87cc87cd-a395-47af-b27a-93258283bbc6',
  comedy: '4d32cc48-9f00-4cca-9b5a-a839f0764984',
  crime: '5ca48985-9a9d-4bd8-be29-80dc0303db72',
  demons: '39730448-9a5f-48a2-85b0-a70db87b1233',
  drama: 'b9af3a63-f058-46de-a9a0-e0c13906197a',
  fantasy: 'cdc58593-87dd-415e-bbc0-2ec27bf404cc',
  harem: 'aafb99c1-7f60-43fa-b75f-fc9502ce29c7',
  historical: '33771934-028e-4cb3-8744-691e866a923e',
  horror: 'cdad7e68-1419-41dd-bdce-27753074a640',
  isekai: 'ace04997-f6bd-436e-b261-779182193d3d',
  magic: 'a1f53773-c69a-4ce5-8cab-fffcd90b1565',
  martialarts: '799c202e-7daa-44eb-9cf7-8a3c0441531e',
  mecha: '50880a9d-5440-4732-9afb-8f457127e836',
  medical: 'c8cbe35b-1b2b-4a3f-9c37-db84c4514856',
  military: 'ac72833b-c4e9-4878-b9db-6c8a4a99444a',
  monsters: '36fd93ea-e8b8-445e-b836-358f02b3d33d',
  mystery: 'ee968100-4191-4968-93d3-f82d72be7e46',
  psychological: '3b60b75c-a2d7-4860-ab56-05f391bb889c',
  reincarnation: '0bc90acb-ccc1-44ca-a34a-b9f3a73259d0',
  romance: '423e2eae-a7a2-4a8b-ac03-a8351462d71d',
  schoollife: 'caaa44eb-cd40-4177-b930-79d3ef2afe87',
  scifi: '256c8bd9-4904-4360-bf4f-508a76d67183',
  sliceoflife: 'e5301a23-ebd9-49dd-a0cb-2add944c7fe9',
  sports: '69964a64-2f90-4d33-beeb-f3ed2875eb4c',
  supernatural: 'eabc5b4c-6aff-42f3-b657-3e90cbd00b75',
  survival: '5fff9cde-849c-4d78-aab0-0d52b2ee1d25',
  thriller: '07251805-a27e-4d59-b488-f0bfbec15168',
  timetravel: '292e862b-2d17-4062-90a2-0356caa4ae27',
  tragedy: 'f8f62932-27da-4fe4-8ee1-6779a8c5edba',
  vampires: 'd7d1730f-6eb0-4ba6-9437-602cac38664c',
  videogames: '9438db5a-7e2a-4ac0-b39e-e0d95a34b8a8',
  villainess: 'd14322ac-4d6f-4e9b-afd9-629d5f4d8a41',
  wuxia: 'acc803a4-c95a-4c22-86fc-eb6b582d82a2',
};

export const GENRE_LABELS: Record<string, string> = {
  action: 'Action',
  adventure: 'Adventure',
  comedy: 'Comedy',
  crime: 'Crime',
  demons: 'Demons',
  drama: 'Drama',
  fantasy: 'Fantasy',
  harem: 'Harem',
  historical: 'Historical',
  horror: 'Horror',
  isekai: 'Isekai',
  magic: 'Magic',
  martialarts: 'Martial Arts',
  mecha: 'Mecha',
  medical: 'Medical',
  military: 'Military',
  monsters: 'Monsters',
  mystery: 'Mystery',
  psychological: 'Psychological',
  reincarnation: 'Reincarnation',
  romance: 'Romance',
  schoollife: 'School Life',
  scifi: 'Sci-Fi',
  sliceoflife: 'Slice of Life',
  sports: 'Sports',
  supernatural: 'Supernatural',
  survival: 'Survival',
  thriller: 'Thriller',
  timetravel: 'Time Travel',
  tragedy: 'Tragedy',
  vampires: 'Vampires',
  videogames: 'Video Games',
  villainess: 'Villainess',
  wuxia: 'Wuxia',
};

export function getComicTypeFromLanguage(originalLanguage?: string): 'manga' | 'manhwa' | 'manhua' | 'other' {
  if (!originalLanguage) return 'other';
  const lang = originalLanguage.toLowerCase();
  if (lang === 'ja') return 'manga';
  if (lang === 'ko') return 'manhwa';
  if (lang === 'zh' || lang === 'zh-hk') return 'manhua';
  return 'other';
}

export function deduplicateChapters(chapters: ChapterItem[]): ChapterItem[] {
  const map = new Map<string, ChapterItem>();

  for (const item of chapters) {
    const key = item.chapter.trim();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
    } else {
      // Pick the newer publish date
      if (new Date(item.publishAt).getTime() > new Date(existing.publishAt).getTime()) {
        map.set(key, item);
      }
    }
  }

  return Array.from(map.values());
}

export function sortChapters(chapters: ChapterItem[], ascending: boolean = false): ChapterItem[] {
  return [...chapters].sort((a, b) => {
    const numA = parseFloat(a.chapter);
    const numB = parseFloat(b.chapter);

    if (!isNaN(numA) && !isNaN(numB)) {
      return ascending ? numA - numB : numB - numA;
    }

    return ascending
      ? a.chapter.localeCompare(b.chapter, undefined, { numeric: true })
      : b.chapter.localeCompare(a.chapter, undefined, { numeric: true });
  });
}

function normalizeTitleForCompare(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function resolveComicTitles(attr: {
  title?: Record<string, string | undefined>;
  altTitles?: Array<Record<string, string | undefined>>;
} | null | undefined): { title: string; altTitle?: string } {
  if (!attr) return { title: 'Judul Tidak Diketahui' };

  const mainTitles = attr.title || {};
  const altTitlesList = attr.altTitles || [];

  const enAltTitles: string[] = [];
  const idAltTitles: string[] = [];
  const romanizedAltTitles: string[] = [];

  for (const alt of altTitlesList) {
    if (alt.id?.trim()) idAltTitles.push(alt.id.trim());
    if (alt.en?.trim()) enAltTitles.push(alt.en.trim());
    if (alt['zh-ro']?.trim()) romanizedAltTitles.push(alt['zh-ro'].trim());
    if (alt['ko-ro']?.trim()) romanizedAltTitles.push(alt['ko-ro'].trim());
    if (alt['ja-ro']?.trim()) romanizedAltTitles.push(alt['ja-ro'].trim());
  }

  const rawEn = mainTitles['en']?.trim() || '';
  const rawId = mainTitles['id']?.trim() || '';
  const rawRo = mainTitles['ja-ro']?.trim() || mainTitles['ko-ro']?.trim() || mainTitles['zh-ro']?.trim() || '';

  // Check if rawEn is actually Romanized Pinyin / Romaja / Romaji
  const isRawEnRomanized = Boolean(
    (rawRo && normalizeTitleForCompare(rawEn) === normalizeTitleForCompare(rawRo)) ||
    romanizedAltTitles.some(r => normalizeTitleForCompare(r) === normalizeTitleForCompare(rawEn))
  );

  let primary = '';
  let tagline = '';

  // 1. If altTitles has an actual English title and rawEn is either absent or Romanized Pinyin/Romaja:
  if (enAltTitles.length > 0 && (!rawEn || isRawEnRomanized)) {
    const realEnAlt = enAltTitles.find(t => normalizeTitleForCompare(t) !== normalizeTitleForCompare(rawEn));
    if (realEnAlt) {
      primary = realEnAlt;
      tagline = rawEn || rawRo || romanizedAltTitles[0] || '';
    }
  }

  if (!primary) {
    if (rawId) {
      primary = rawId;
      tagline = rawEn || enAltTitles[0] || rawRo || '';
    } else if (rawEn) {
      primary = rawEn;
      tagline = enAltTitles.find(t => t !== rawEn) || rawRo || romanizedAltTitles[0] || '';
    } else if (enAltTitles.length > 0) {
      primary = enAltTitles[0];
      tagline = rawRo || romanizedAltTitles[0] || '';
    } else if (rawRo) {
      primary = rawRo;
      tagline = Object.values(mainTitles)[0] || '';
    } else {
      primary = Object.values(mainTitles)[0] || 'Judul Tidak Diketahui';
    }
  }

  return {
    title: primary,
    altTitle: tagline && tagline !== primary ? tagline : undefined,
  };
}

export function getEnglishTitle(attr: {
  title?: Record<string, string | undefined>;
  altTitles?: Array<Record<string, string | undefined>>;
} | null | undefined): string {
  return resolveComicTitles(attr).title;
}

export function buildSearchQueryUrl(options: {
  query?: string;
  type?: ComicType;
  isColor?: boolean;
  genre?: string;
  limit?: number;
  offset?: number;
  baseUrl?: string;
  requireIndonesian?: boolean;
}): string {
  const params = new URLSearchParams();

  // If explicitly requested, filter by Indonesian
  if (options.requireIndonesian) {
    params.append('availableTranslatedLanguage[]', 'id');
  }

  params.append('includes[]', 'cover_art');
  params.append('contentRating[]', 'safe');
  params.append('contentRating[]', 'suggestive');
  params.append('contentRating[]', 'erotica');

  if (options.order) {
    for (const [key, dir] of Object.entries(options.order)) {
      params.set(`order[${key}]`, dir);
    }
  } else if (options.query && options.query.trim()) {
    params.set('title', options.query.trim());
  } else {
    // Default to most followed/popular if no query text
    params.set('order[followedCount]', 'desc');
  }

  if (options.limit) {
    params.set('limit', String(options.limit));
  } else {
    params.set('limit', '24');
  }

  if (options.offset) {
    params.set('offset', String(options.offset));
  }

  // Type filter
  if (options.type && options.type !== 'all') {
    if (options.type === 'manga') params.append('originalLanguage[]', 'ja');
    if (options.type === 'manhwa') params.append('originalLanguage[]', 'ko');
    if (options.type === 'manhua') {
      params.append('originalLanguage[]', 'zh');
      params.append('originalLanguage[]', 'zh-hk');
    }
  }

  // Tags filter (Full color & genres)
  const includedTags: string[] = [];
  if (options.isColor) {
    includedTags.push(FULL_COLOR_TAG_ID);
  }

  if (options.genre && GENRE_TAG_IDS[options.genre.toLowerCase()]) {
    includedTags.push(GENRE_TAG_IDS[options.genre.toLowerCase()]);
  }

  for (const tagId of includedTags) {
    params.append('includedTags[]', tagId);
  }

  const base = options.baseUrl || getApiBase();
  return `${base}/manga?${params.toString()}`;
}

export async function fetchLatestUpdates(limit: number = 60, offset: number = 0): Promise<ComicCardItem[]> {
  try {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (offset > 0) {
      params.set('offset', String(offset));
    }
    params.append('translatedLanguage[]', 'id');
    params.set('order[readableAt]', 'desc');
    params.append('includes[]', 'manga');

    const res = await fetch(`${getApiBase()}/chapter?${params.toString()}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Batas akses terlampaui (429). Silakan tunggu beberapa detik.');
      }
      throw new Error(`Gagal memuat rilis terbaru: status ${res.status}`);
    }

    const data = await res.json();
    const items: ComicCardItem[] = [];
    const seenManga = new Set<string>();

    for (const ch of data.data || []) {
      const mangaRel = ch.relationships?.find((r: { type: string }) => r.type === 'manga');
      if (!mangaRel || seenManga.has(mangaRel.id)) continue;
      seenManga.add(mangaRel.id);

      const mangaAttr = mangaRel.attributes || {};
      const { title, altTitle } = resolveComicTitles(mangaAttr);

      const type = getComicTypeFromLanguage(mangaAttr.originalLanguage);

      items.push({
        id: mangaRel.id,
        title: String(title),
        altTitle,
        coverUrl: '', // Will be resolved or lazy loaded with placeholder
        type,
        latestChapter: ch.attributes?.chapter ? `Ch. ${ch.attributes.chapter}` : undefined,
        updatedAt: ch.attributes?.readableAt || ch.attributes?.publishAt,
      });
    }

    // Now resolve covers for these manga in one batch
    if (items.length > 0) {
      const mangaIds = items.map(i => i.id);
      const coverMap = await fetchCoversForManga(mangaIds);
      for (const item of items) {
        if (coverMap.has(item.id)) {
          item.coverUrl = coverMap.get(item.id)!;
        }
      }
    }

    return items;
  } catch (err) {
    console.error('fetchLatestUpdates error:', err);
    throw err;
  }
}

export async function fetchCoversForManga(mangaIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!mangaIds.length) return map;

  try {
    const params = new URLSearchParams();
    params.set('limit', '100');
    for (const id of mangaIds) {
      params.append('manga[]', id);
    }

    const res = await fetch(`${getApiBase()}/cover?${params.toString()}`, {
      next: { revalidate: 300 },
    });

    if (res.ok) {
      const data = await res.json();
      for (const cover of data.data || []) {
        const mangaRel = cover.relationships?.find((r: { type: string }) => r.type === 'manga');
        if (mangaRel && cover.attributes?.fileName) {
          const coverUrl = `${MANGADEX_COVER_BASE}/${mangaRel.id}/${cover.attributes.fileName}.256.jpg`;
          map.set(mangaRel.id, coverUrl);
        }
      }
    }
  } catch (e) {
    console.error('fetchCovers error:', e);
  }

  return map;
}

export async function searchComics(
  query: string,
  options?: FilterOptions
): Promise<ComicCardItem[]> {
  try {
    const url = buildSearchQueryUrl({
      query,
      type: options?.type,
      isColor: options?.isColor,
      genre: options?.genre,
      limit: options?.limit || 30,
      offset: options?.offset || 0,
    });

    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) {
      if (res.status === 429) {
        throw new Error('Batas akses terlampaui (429). Silakan coba lagi sesaat lagi.');
      }
      throw new Error(`Failed to search comics: ${res.status}`);
    }

    const data = await res.json();
    const items: ComicCardItem[] = [];

    for (const m of data.data || []) {
      const attr = m.attributes || {};
      const { title, altTitle } = resolveComicTitles(attr);

      const type = getComicTypeFromLanguage(attr.originalLanguage);

      // Extract cover art relationship
      const coverRel = m.relationships?.find((r: { type: string }) => r.type === 'cover_art');
      const coverFileName = coverRel?.attributes?.fileName;
      const coverUrl = coverFileName
        ? `${MANGADEX_COVER_BASE}/${m.id}/${coverFileName}.256.jpg`
        : '';

      const isFullColor = attr.tags?.some((t: { id: string }) => t.id === FULL_COLOR_TAG_ID);

      const genres: string[] = (attr.tags || [])
        .filter((t: { attributes?: { group: string } }) => t.attributes?.group === 'genre')
        .map((t: { attributes?: { name: { en?: string } } }) => t.attributes?.name?.en)
        .filter(Boolean);

      items.push({
        id: m.id,
        title: String(title),
        altTitle,
        coverUrl,
        type,
        isFullColor,
        genres,
      });
    }

    return items;
  } catch (err) {
    console.error('searchComics error:', err);
    throw err;
  }
}

export async function fetchLatestComicsByType(
  type: ComicType = 'all',
  limit: number = 10,
  offset: number = 0
): Promise<ComicCardItem[]> {
  return await searchComics('', {
    type,
    limit,
    offset,
    order: { latestUploadedChapter: 'desc' },
  });
}

export async function fetchTopComics(
  type: ComicType = 'all',
  limit: number = 15,
  offset: number = 0
): Promise<ComicCardItem[]> {
  return await searchComics('', {
    type,
    limit,
    offset,
    order: { followedCount: 'desc' },
  });
}

export async function fetchComicDetail(mangaId: string): Promise<ComicDetail | null> {
  try {
    const params = new URLSearchParams();
    params.append('includes[]', 'cover_art');
    params.append('includes[]', 'author');
    params.append('includes[]', 'artist');

    const res = await fetch(`${getApiBase()}/manga/${mangaId}?${params.toString()}`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;
    const json = await res.json();
    const data = json.data;
    if (!data) return null;

    const attr = data.attributes || {};
    const { title, altTitle: resolvedAlt } = resolveComicTitles(attr);

    const rawAltTitles: string[] = (attr.altTitles || []).map((t: Record<string, string>) => Object.values(t)[0]).filter(Boolean);
    if (resolvedAlt && !rawAltTitles.includes(resolvedAlt)) {
      rawAltTitles.push(resolvedAlt);
    }
    const altTitles = rawAltTitles.sort((a, b) => {
      const aIsAscii = /^[\x00-\x7F\u2019\u2018\u201C\u201D]+$/.test(a) ? 2 : (/[a-zA-Z]/.test(a) ? 1 : 0);
      const bIsAscii = /^[\x00-\x7F\u2019\u2018\u201C\u201D]+$/.test(b) ? 2 : (/[a-zA-Z]/.test(b) ? 1 : 0);
      return bIsAscii - aIsAscii;
    });
    const description = attr.description?.id || attr.description?.en || Object.values(attr.description || {})[0] || 'Tidak ada sinopsis.';

    const coverRel = data.relationships?.find((r: { type: string }) => r.type === 'cover_art');
    const coverFileName = coverRel?.attributes?.fileName;
    const coverUrl = coverFileName ? `${MANGADEX_COVER_BASE}/${data.id}/${coverFileName}.512.jpg` : '';

    const authorRel = data.relationships?.find((r: { type: string }) => r.type === 'author');
    const artistRel = data.relationships?.find((r: { type: string }) => r.type === 'artist');

    const genres: string[] = (attr.tags || [])
      .filter((t: { attributes?: { group: string } }) => t.attributes?.group === 'genre')
      .map((t: { attributes?: { name: { en?: string } } }) => t.attributes?.name?.en)
      .filter(Boolean);

    const isFullColor = (attr.tags || []).some((t: { id: string }) => t.id === FULL_COLOR_TAG_ID);

    return {
      id: data.id,
      title: String(title),
      altTitles,
      description: String(description),
      coverUrl,
      type: getComicTypeFromLanguage(attr.originalLanguage),
      status: attr.status || 'ongoing',
      genres,
      isFullColor,
      author: authorRel?.attributes?.name,
      artist: artistRel?.attributes?.name,
      year: attr.year,
    };
  } catch (err) {
    console.error('fetchComicDetail error:', err);
    return null;
  }
}

export async function fetchComicChapters(
  mangaId: string,
  preferredLanguage: string = 'id'
): Promise<ChapterItem[]> {
  try {
    const fetchWithLang = async (lang?: string): Promise<ChapterItem[]> => {
      const chapters: ChapterItem[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const params = new URLSearchParams();
        params.set('limit', String(limit));
        params.set('offset', String(offset));
        if (lang) {
          params.append('translatedLanguage[]', lang);
        }
        params.set('order[chapter]', 'desc');
        params.append('includes[]', 'scanlation_group');

        const res = await fetch(`${getApiBase()}/manga/${mangaId}/feed?${params.toString()}`, {
          next: { revalidate: 60 },
        });

        if (!res.ok) break;

        const data = await res.json();
        const list = data.data || [];

        for (const ch of list) {
          const groupRel = ch.relationships?.find((r: { type: string }) => r.type === 'scanlation_group');
          chapters.push({
            id: ch.id,
            chapter: ch.attributes?.chapter || '0',
            title: ch.attributes?.title || undefined,
            scanlationGroup: groupRel?.attributes?.name || 'Komunitas',
            publishAt: ch.attributes?.publishAt || ch.attributes?.readableAt,
            pagesCount: ch.attributes?.pages || 0,
          });
        }

        offset += limit;
        if (list.length < limit || offset >= (data.total || 0) || offset >= 500) {
          hasMore = false;
        }
      }

      return deduplicateChapters(chapters);
    };

    // Return chapters strictly matching the requested language
    return await fetchWithLang(preferredLanguage);
  } catch (err) {
    console.error('fetchComicChapters error:', err);
    return [];
  }
}

export async function fetchMangaIdFromChapter(chapterId: string): Promise<string | null> {
  try {
    const res = await fetch(`${getApiBase()}/chapter/${chapterId}`);
    if (!res.ok) return null;
    const data = await res.json();
    const mangaRel = data.data?.relationships?.find((r: { type: string }) => r.type === 'manga');
    return mangaRel?.id || null;
  } catch {
    return null;
  }
}

export async function fetchChapterPages(chapterId: string): Promise<ChapterPageItem[]> {
  try {
    const decodedId = decodeURIComponent(chapterId || '');

    // If chapter ID is from Komiku provider (komiku--chapterSlug or komiku:...)
    if (decodedId.startsWith('komiku--') || decodedId.startsWith('komiku:')) {
      const chapterSlug = decodedId.replace(/^komiku(--|:)/, '');

      if (typeof window !== 'undefined') {
        const res = await fetch(`/api/komiku?action=pages&chapter=${encodeURIComponent(chapterSlug)}`);
        if (res.ok) {
          const data = await res.json();
          return data.pages || [];
        }
      } else {
        const { fetchKomikuChapterImages } = await import('./komiku');
        return await fetchKomikuChapterImages(chapterSlug);
      }
      return [];
    }

    // If chapter ID is from Komikindo provider (komikindo--chapterSlug or komikindo:...)
    if (decodedId.startsWith('komikindo--') || decodedId.startsWith('komikindo:')) {
      const chapterSlug = decodedId.replace(/^komikindo(--|:)/, '');

      if (typeof window !== 'undefined') {
        const res = await fetch(`/api/komikindo?action=pages&chapter=${encodeURIComponent(chapterSlug)}`);
        if (res.ok) {
          const data = await res.json();
          return data.pages || [];
        }
      } else {
        const { fetchKomikindoChapterImages } = await import('./komikindo');
        return await fetchKomikindoChapterImages(chapterSlug);
      }
      return [];
    }

    const res = await fetch(`${getApiBase()}/at-home/server/${decodedId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch chapter server: ${res.status}`);
    }

    const data = await res.json();
    const baseUrl = data.baseUrl;
    const hash = data.chapter?.hash;
    const files: string[] = data.chapter?.data || [];

    if (!baseUrl || !hash || !files.length) return [];

    return files.map(file => ({
      url: `${baseUrl}/data/${hash}/${file}`,
      fallbackUrl: `https://uploads.mangadex.org/data/${hash}/${file}`,
    }));
  } catch (err) {
    console.error('fetchChapterPages error:', err);
    return [];
  }
}
