import { NextRequest, NextResponse } from 'next/server';
import {
  findKomikindoSlug,
  fetchKomikindoChapters,
  fetchKomikindoChapterImages,
  fetchKomikindoDetail,
  searchKomikindo,
} from '@/lib/komikindo';

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
        const slug = await findKomikindoSlug(q, altTitles);
        return NextResponse.json({ slug }, { headers: CACHE_HEADERS });
      }

      const comics = await searchKomikindo(q);
      return NextResponse.json({ comics }, { headers: CACHE_HEADERS });
    }

    if (action === 'detail') {
      const slug = searchParams.get('slug') || '';
      const detail = await fetchKomikindoDetail(slug);
      return NextResponse.json({ detail }, { headers: CACHE_HEADERS });
    }

    if (action === 'chapters') {
      const slug = searchParams.get('slug') || '';
      const chapters = await fetchKomikindoChapters(slug);
      return NextResponse.json({ chapters }, { headers: CACHE_HEADERS });
    }

    if (action === 'pages') {
      const chapterSlug = searchParams.get('chapter') || searchParams.get('slug') || '';
      const pages = await fetchKomikindoChapterImages(chapterSlug);
      return NextResponse.json({ pages }, { headers: CACHE_HEADERS });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
