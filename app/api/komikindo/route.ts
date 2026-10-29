import { NextRequest, NextResponse } from 'next/server';
import { sanitizeSlug, clampInteger } from '@/lib/security';
import {
  findKomikindoSlug,
  fetchKomikindoChapters,
  fetchKomikindoChapterImages,
  fetchKomikindoDetail,
  fetchKomikindoLatest,
  searchKomikindo,
} from '@/lib/komikindo';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
};

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

const LATEST_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, max-age=60, stale-while-revalidate=120',
};

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    if (action === 'search' || action === 'slug') {
      const q = searchParams.get('q') || searchParams.get('title') || '';
      const altTitlesRaw = searchParams.get('altTitles') || '';
      const altTitles = altTitlesRaw ? altTitlesRaw.split('|').filter(Boolean) : [];

      if (searchParams.get('slugOnly') === 'true' || action === 'slug') {
        const slug = await findKomikindoSlug(q, altTitles);
        return NextResponse.json({ slug }, { headers: CACHE_HEADERS });
      }

      const comics = await searchKomikindo(q);
      return NextResponse.json({ comics }, { headers: CACHE_HEADERS });
    }

    if (action === 'detail') {
      const slug = sanitizeSlug(searchParams.get('slug'));
      if (!slug) {
        return NextResponse.json({ error: 'Slug tidak valid' }, { status: 400 });
      }
      const detail = await fetchKomikindoDetail(slug);
      return NextResponse.json(
        { detail },
        { headers: detail ? CACHE_HEADERS : NO_STORE_HEADERS }
      );
    }

    if (action === 'latest') {
      const type = (searchParams.get('type') || 'all') as 'manga' | 'manhwa' | 'manhua' | 'all';
      const page = clampInteger(searchParams.get('page'), 1, 500, 1);
      const limit = clampInteger(searchParams.get('limit'), 1, 50, 10);
      const comics = await fetchKomikindoLatest(type, page, limit);
      return NextResponse.json({ comics }, { headers: LATEST_CACHE_HEADERS });
    }

    if (action === 'chapters') {
      const slug = sanitizeSlug(searchParams.get('slug'));
      if (!slug) {
        return NextResponse.json({ error: 'Slug tidak valid' }, { status: 400 });
      }
      const chapters = await fetchKomikindoChapters(slug);
      return NextResponse.json(
        { chapters },
        { headers: chapters.length > 0 ? CACHE_HEADERS : NO_STORE_HEADERS }
      );
    }

    if (action === 'pages') {
      const chapterSlug = sanitizeSlug(searchParams.get('chapter') || searchParams.get('slug'));
      if (!chapterSlug) {
        return NextResponse.json({ error: 'Chapter slug tidak valid' }, { status: 400 });
      }
      const pages = await fetchKomikindoChapterImages(chapterSlug);
      return NextResponse.json(
        { pages },
        { headers: pages.length > 0 ? CACHE_HEADERS : NO_STORE_HEADERS }
      );
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
