import { ChapterItem, ChapterPageItem } from './types';
import { deduplicateChapters, sortChapters } from './mangadex';

const KOMIKU_BASE = 'https://komiku.org';
const KOMIKU_API_SEARCH = 'https://api.komiku.org';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function findKomikuSlug(title: string, altTitles?: string[]): Promise<string | null> {
  const titlesToTry = [title, ...(altTitles || [])].filter(Boolean);

  for (const t of titlesToTry.slice(0, 3)) {
    try {
      const searchUrl = `${KOMIKU_API_SEARCH}/?post_type=manga&s=${encodeURIComponent(t)}`;
      const res = await fetch(searchUrl, {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 3600 },
      });

      if (!res.ok) continue;

      const html = await res.text();
      const match = html.match(/<div class="bge">[\s\S]*?<a href="([^"]+)"/);
      if (match && match[1]) {
        return match[1].replace(/^\/manga\//, '').replace(/\/$/, '');
      }
    } catch (e) {
      console.error('findKomikuSlug error:', e);
    }
  }

  return null;
}

export async function fetchKomikuChapters(slug: string): Promise<ChapterItem[]> {
  try {
    const url = `${KOMIKU_BASE}/manga/${slug}/`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const matches = [...html.matchAll(/href="(\/[^"]*chapter-([0-9.]+)[^"]*)"/g)];
    const chapters: ChapterItem[] = [];

    for (const m of matches) {
      const chapterNum = m[2];
      chapters.push({
        id: `komiku:${slug}:${chapterNum}`,
        chapter: chapterNum,
        title: `Chapter ${chapterNum}`,
        scanlationGroup: 'Komiku Sub Indo',
        publishAt: '',
        pagesCount: 0,
      });
    }

    return sortChapters(deduplicateChapters(chapters), false);
  } catch (e) {
    console.error('fetchKomikuChapters error:', e);
    return [];
  }
}

export async function fetchKomikuChapterImages(slug: string, chapterNum: string): Promise<ChapterPageItem[]> {
  try {
    const url = `${KOMIKU_BASE}/${slug}-chapter-${chapterNum}/`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 300 },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const imgIdx = html.indexOf('id="Baca_Komik"');
    if (imgIdx === -1) return [];

    const endIdx = html.indexOf('</div>', imgIdx + 2000);
    const slice = html.slice(imgIdx, endIdx !== -1 ? endIdx : html.length);
    const imgMatches = [...slice.matchAll(/src="([^"]+)"/g)];

    const urls = imgMatches
      .map(m => m[1])
      .filter(u => u && u.startsWith('http') && !u.includes('promosi') && !u.includes('iklan'));

    return urls.map(u => ({
      url: u,
      fallbackUrl: u,
    }));
  } catch (e) {
    console.error('fetchKomikuChapterImages error:', e);
    return [];
  }
}
