import { NextRequest, NextResponse } from 'next/server';
import {
  findKomikuSlug,
  fetchKomikuChapters,
  fetchKomikuChapterImages,
  fetchKomikuDetail,
  searchKomiku,
} from '@/lib/komiku';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
};

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    if (action === 'search') {
      const title = searchParams.get('title') || searchParams.get('q') || '';
      const altTitlesRaw = searchParams.get('altTitles') || '';
      const altTitles = altTitlesRaw ? altTitlesRaw.split('|').filter(Boolean) : [];
      const slug = await findKomikuSlug(title, altTitles);

      if (searchParams.get('slugOnly') === 'true') {
        return NextResponse.json({ slug }, { headers: CACHE_HEADERS });
      }

      const comics = await searchKomiku(title);
      return NextResponse.json({ slug, comics }, { headers: CACHE_HEADERS });
    }

    if (action === 'detail') {
      const slug = searchParams.get('slug') || '';
      const detail = await fetchKomikuDetail(slug);
      return NextResponse.json({ detail }, { headers: CACHE_HEADERS });
    }

    if (action === 'chapters') {
      const slug = searchParams.get('slug') || '';
      const chapters = await fetchKomikuChapters(slug);
      return NextResponse.json({ chapters }, { headers: CACHE_HEADERS });
    }

    if (action === 'pages') {
      const chapterSlug = searchParams.get('chapter') || searchParams.get('slug') || '';
      const fallbackNum = searchParams.get('num') || undefined;
      const pages = await fetchKomikuChapterImages(chapterSlug, fallbackNum);
      return NextResponse.json({ pages }, { headers: CACHE_HEADERS });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
