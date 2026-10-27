import { NextRequest, NextResponse } from 'next/server';
import { sanitizeSlug } from '@/lib/security';
import {
  findMangaPillPath,
  fetchMangaPillChapters,
  fetchMangaPillChapterImages,
  searchMangaPill,
} from '@/lib/mangapill';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
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
        const path = await findMangaPillPath(q, altTitles);
        return NextResponse.json({ path }, { headers: CACHE_HEADERS });
      }

      const comics = await searchMangaPill(q);
      return NextResponse.json({ comics }, { headers: CACHE_HEADERS });
    }

    if (action === 'chapters') {
      const pathParam = searchParams.get('path') || '';
      if (!pathParam) {
        return NextResponse.json({ error: 'Parameter path wajib diisi' }, { status: 400 });
      }
      const chapters = await fetchMangaPillChapters(pathParam);
      return NextResponse.json({ chapters }, { headers: CACHE_HEADERS });
    }

    if (action === 'pages') {
      const pathParam = searchParams.get('path') || '';
      if (!pathParam) {
        return NextResponse.json({ error: 'Parameter path wajib diisi' }, { status: 400 });
      }
      const pages = await fetchMangaPillChapterImages(pathParam);
      return NextResponse.json({ pages }, { headers: CACHE_HEADERS });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
