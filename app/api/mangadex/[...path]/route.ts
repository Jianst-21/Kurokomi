import { NextRequest, NextResponse } from 'next/server';
import { isAllowedMangaDexSubpath } from '@/lib/security';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const subpath = path.join('/');

    if (!isAllowedMangaDexSubpath(subpath)) {
      return NextResponse.json(
        { error: 'Akses proxy ke endpoint ini ditolak' },
        { status: 403 }
      );
    }

    const search = req.nextUrl.search;
    const targetUrl = `https://api.mangadex.org/${subpath}${search}`;

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Kurokomi/1.0 (https://kurokomi.vercel.app)',
        'Accept': 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `MangaDex API error ${res.status}: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
