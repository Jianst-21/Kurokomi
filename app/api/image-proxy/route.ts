import { NextRequest, NextResponse } from 'next/server';
import { isAllowedImageProxyUrl } from '@/lib/security';

export const runtime = 'edge';

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

    // Softkomik CDN hotlink bypass: forward through Cloudflare Worker if available
    if (host.includes('komik.im')) {
      const cfWorker = process.env.CF_WORKER_PROXY || 'https://kurokomi-image-proxy.kurokomi.workers.dev';
      try {
        const workerRes = await fetch(`${cfWorker}/?url=${encodeURIComponent(urlParam)}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (workerRes.ok) {
          const contentType = workerRes.headers.get('content-type') || 'image/webp';
          const buffer = await workerRes.arrayBuffer();
          return new NextResponse(buffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400, immutable',
            },
          });
        }
      } catch {
        // Fall back to direct fetch
      }
    }

    // Whitelisted crawler user-agents bypass Cloudflare datacenter bot challenges
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Referer': referer,
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    };

    let res = await fetch(urlParam, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(10000),
    });

    // Fallback between Softkomik mirror CDNs if one CDN fails or redirects to promo banner
    if (host.includes('komik.im')) {
      const isTrap = res.url.includes('baca-image') || res.headers.get('location')?.includes('baca-image');
      if (!res.ok || isTrap) {
        const altUrl = host.includes('image.komik.im')
          ? urlParam.replace('image.komik.im/softkomik', 'psy1.komik.im').replace('image.komik.im', 'psy1.komik.im')
          : urlParam.replace('psy1.komik.im', 'image.komik.im/softkomik');
        if (altUrl !== urlParam) {
          try {
            const retryRes = await fetch(altUrl, {
              headers: upstreamHeaders,
              signal: AbortSignal.timeout(10000),
            });
            if (retryRes.ok && !retryRes.url.includes('baca-image')) {
              res = retryRes;
            }
          } catch {
            // keep original response
          }
        }
      }
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      const titleMatch = errBody.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : '';
      return NextResponse.json(
        { error: `Gagal mengambil gambar: ${res.status}`, title, snippet: errBody.replace(/<[^>]+>/g, ' ').substring(0, 300).trim() },
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
