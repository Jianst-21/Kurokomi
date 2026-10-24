import { NextRequest, NextResponse } from 'next/server';
import { findKomikuSlug, fetchKomikuChapters, fetchKomikuChapterImages } from '@/lib/komiku';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    if (action === 'search') {
      const title = searchParams.get('title') || '';
      const slug = await findKomikuSlug(title);
      return NextResponse.json({ slug });
    }

    if (action === 'chapters') {
      const slug = searchParams.get('slug') || '';
      const chapters = await fetchKomikuChapters(slug);
      return NextResponse.json({ chapters });
    }

    if (action === 'pages') {
      const slug = searchParams.get('slug') || '';
      const chapter = searchParams.get('chapter') || '1';
      const pages = await fetchKomikuChapterImages(slug, chapter);
      return NextResponse.json({ pages });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
