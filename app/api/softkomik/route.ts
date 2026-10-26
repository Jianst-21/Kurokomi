import { NextRequest, NextResponse } from 'next/server';
import {
  findSoftkomikSlug,
  fetchSoftkomikChapters,
  fetchSoftkomikChapterImages,
  fetchSoftkomikDetail,
  fetchSoftkomikLatest,
  searchSoftkomik,
} from '@/lib/softkomik';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
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
        const slug = await findSoftkomikSlug(q, altTitles);
        return NextResponse.json({ slug }, { headers: CACHE_HEADERS });
      }

      const comics = await searchSoftkomik(q);
      return NextResponse.json({ comics }, { headers: CACHE_HEADERS });
    }

    if (action === 'detail') {
      const slug = searchParams.get('slug') || '';
      const detail = await fetchSoftkomikDetail(slug);
      return NextResponse.json({ detail }, { headers: CACHE_HEADERS });
    }

    if (action === 'latest') {
      const type = (searchParams.get('type') || 'all') as 'manga' | 'manhwa' | 'manhua' | 'all';
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      const comics = await fetchSoftkomikLatest(type, page, limit);
      return NextResponse.json({ comics }, { headers: LATEST_CACHE_HEADERS });
    }

    if (action === 'chapters') {
      const slug = searchParams.get('slug') || '';
      const chapters = await fetchSoftkomikChapters(slug);
      return NextResponse.json({ chapters }, { headers: CACHE_HEADERS });
    }

    if (action === 'pages') {
      const slug = searchParams.get('slug') || '';
      const chapter = searchParams.get('chapter') || '';
      const pages = await fetchSoftkomikChapterImages(slug, chapter);
      return NextResponse.json({ pages }, { headers: CACHE_HEADERS });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
