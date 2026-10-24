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
    // Matches href="/[chapter-slug]/" and captures exact chapter path and chapter number
    const matches = [...html.matchAll(/href="(\/([^"]*chapter-([0-9.]+)[^"]*))"/g)];
    const chapters: ChapterItem[] = [];

    for (const m of matches) {
      const exactChapterSlug = m[2].replace(/\/$/, '');
      const chapterNum = m[3];
      chapters.push({
        id: `komiku--${exactChapterSlug}`,
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

export async function fetchKomikuChapterImages(chapterSlug: string, fallbackChapterNum?: string): Promise<ChapterPageItem[]> {
  try {
    let cleanSlug = chapterSlug.replace(/^\//, '').replace(/\/$/, '');

    if (cleanSlug.startsWith('komiku--')) {
      cleanSlug = cleanSlug.replace(/^komiku--/, '');
    }

    // 1. Fetch using exact chapter slug
    let url = `${KOMIKU_BASE}/${cleanSlug}/`;
    let res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      next: { revalidate: 300 },
    });

    // 2. If 404 and cleanSlug has parts, try alternative reconstructed URL
    if (!res.ok && cleanSlug.includes('--')) {
      const parts = cleanSlug.split('--');
      const s = parts[0];
      const ch = parts[1] || fallbackChapterNum;
      url = `${KOMIKU_BASE}/${s}-chapter-${ch}/`;
      res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        next: { revalidate: 300 },
      });
    }

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
