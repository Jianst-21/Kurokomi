import { NextRequest, NextResponse } from 'next/server';
import { sanitizeSlug } from '@/lib/security';
import {
  searchQimanga,
  findQimangaSlug,
  fetchQimangaChapters,
  fetchQimangaChapterImages,
} from '@/lib/qimanga';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
};

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
};

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    if (action === 'search' || action === 'slug') {
      const title = searchParams.get('title') || searchParams.get('q') || '';
      const altTitlesRaw = searchParams.get('altTitles') || '';
      const altTitles = altTitlesRaw ? altTitlesRaw.split('|').filter(Boolean) : [];

      if (searchParams.get('slugOnly') === 'true' || action === 'slug') {
        const slug = await findQimangaSlug(title, altTitles);
        return NextResponse.json({ slug }, { headers: CACHE_HEADERS });
      }

      const comics = await searchQimanga(title);
      return NextResponse.json({ comics }, { headers: CACHE_HEADERS });
    }

    if (action === 'chapters') {
      const slug = sanitizeSlug(searchParams.get('slug'));
      if (!slug) {
        return NextResponse.json({ error: 'Slug tidak valid' }, { status: 400 });
      }
      const chapters = await fetchQimangaChapters(slug);
      return NextResponse.json(
        { chapters },
        { headers: chapters.length > 0 ? CACHE_HEADERS : NO_STORE_HEADERS }
      );
    }

    if (action === 'pages') {
      const slug = sanitizeSlug(searchParams.get('slug'));
      const chapter = sanitizeSlug(searchParams.get('chapter'));
      if (!slug || !chapter) {
        return NextResponse.json({ error: 'Slug atau chapter tidak valid' }, { status: 400 });
      }
      const pages = await fetchQimangaChapterImages(slug, chapter);
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
