import { NextRequest, NextResponse } from 'next/server';
import { isAllowedImageProxyUrl } from '@/lib/security';

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');

  if (!urlParam || !isAllowedImageProxyUrl(urlParam)) {
    return NextResponse.json(
      { error: 'URL gambar tidak valid atau tidak diizinkan' },
      { status: 400 }
    );
  }

  try {
    const parsed = new URL(urlParam);
    const host = parsed.hostname.toLowerCase();

    // Set matching upstream referer to bypass hotlink protection
    let referer = 'https://kurokomi.vercel.app/';
    if (host.includes('komik.im') || host.includes('softdevices.my.id') || host.includes('softkomik')) {
      referer = 'https://softkomik.app/';
    } else if (host.includes('komiku')) {
      referer = 'https://komiku.org/';
    } else if (host.includes('komikindo') || host.endsWith('.lol') || host.includes('googleusercontent')) {
      referer = 'https://komikindo.ch/';
    } else if (host.includes('mangadex')) {
      referer = 'https://mangadex.org/';
    } else if (host.includes('mangapill') || host.includes('readdetectiveconan')) {
      referer = 'https://mangapill.com/';
    }

    const res = await fetch(urlParam, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Gagal mengambil gambar: ${res.status}` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400, immutable',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
