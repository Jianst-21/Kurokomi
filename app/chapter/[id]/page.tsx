'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  X,
  ChevronRight,
  Check,
} from 'lucide-react';
import { ChapterItem, ComicDetail } from '@/lib/types';
import {
  fetchChapterPages,
  fetchComicChapters,
  fetchComicDetail,
  fetchMangaIdFromChapter,
  sortChapters,
} from '@/lib/mangadex';
import { saveHistory } from '@/lib/storage';
import { ReaderHUD } from '@/components/ReaderHUD';
import { ReaderImage } from '@/components/ReaderImage';

export default function ReaderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const chapterId = params?.id as string;
  const initialMangaId = searchParams.get('mangaId') || '';

  const [mangaId, setMangaId] = useState(initialMangaId);
  const [pages, setPages] = useState<string[]>([]);
  const [comic, setComic] = useState<ComicDetail | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hudVisible, setHudVisible] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadChapter = async () => {
    if (!chapterId) return;
    setIsLoading(true);
    setError(null);

    try {
      const pageUrls = await fetchChapterPages(chapterId);
      if (!pageUrls.length) {
        throw new Error('Halaman chapter tidak dapat dimuat.');
      }
      setPages(pageUrls);

      // Auto-resolve mangaId if missing
      let targetMangaId = mangaId;
      if (!targetMangaId) {
        const resolved = await fetchMangaIdFromChapter(chapterId);
        if (resolved) {
          targetMangaId = resolved;
          setMangaId(resolved);
        }
      }

      // Load manga details & chapter list
      if (targetMangaId) {
        const [detailData, chaptersData] = await Promise.all([
          comic ? Promise.resolve(comic) : fetchComicDetail(targetMangaId),
          chapters.length ? Promise.resolve(chapters) : fetchComicChapters(targetMangaId),
        ]);

        if (detailData) setComic(detailData);
        if (chaptersData) setChapters(chaptersData);

        // Save to reading history
        const currentCh = chaptersData?.find(c => c.id === chapterId);
        if (detailData) {
          saveHistory({
            mangaId: detailData.id,
            title: detailData.title,
            coverUrl: detailData.coverUrl,
            type: detailData.type,
            chapterId: chapterId,
            chapterNumber: currentCh?.chapter || '?',
            readAt: new Date().toISOString(),
          });
        }
      }
    } catch {
      setError('Gagal memuat halaman chapter. Silakan periksa koneksi Anda.');
    } finally {
      setIsLoading(false);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  useEffect(() => {
    loadChapter();
  }, [chapterId]);

  // Sort chapters ascending for sequential reading
  const ascChapters = sortChapters(chapters, true);

  const currentIndex = ascChapters.findIndex(c => c.id === chapterId);
  const currentChapter = currentIndex >= 0 ? ascChapters[currentIndex] : null;

  const prevChapter = currentIndex > 0 ? ascChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < ascChapters.length - 1
    ? ascChapters[currentIndex + 1]
    : null;

  const toggleHUD = () => {
    setHudVisible(prev => !prev);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 gap-3">
        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="text-xs text-zinc-400">Memuat gambar chapter...</span>
      </div>
    );
  }

  if (error || !pages.length) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <p className="text-sm text-zinc-300 max-w-xs">{error || 'Chapter tidak ditemukan'}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-zinc-800 text-xs font-medium rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>
          <button
            onClick={() => loadChapter()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba Lagi</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col select-none relative">
      {/* Floating HUD */}
      <ReaderHUD
        visible={hudVisible}
        comicTitle={comic?.title || 'Komik'}
        currentChapter={currentChapter?.chapter || '?'}
        mangaId={mangaId}
        prevChapterId={prevChapter?.id}
        prevChapterNumber={prevChapter?.chapter}
        nextChapterId={nextChapter?.id}
        nextChapterNumber={nextChapter?.chapter}
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      {/* Main Comic Image Stream (Webtoon Scroll) */}
      <main
        onClick={toggleHUD}
        className="flex-1 max-w-lg mx-auto w-full flex flex-col items-center bg-black cursor-pointer pt-1"
      >
        {pages.map((url, idx) => (
          <ReaderImage key={url} src={url} pageIndex={idx} />
        ))}

        {/* End of Chapter Section */}
        <div className="w-full p-8 flex flex-col items-center justify-center text-center gap-4 bg-zinc-950 border-t border-zinc-850 my-6">
          <span className="text-xs text-zinc-400 font-medium">
            Akhir dari Chapter {currentChapter?.chapter || ''}
          </span>

          {nextChapter ? (
            <Link
              href={`/chapter/${nextChapter.id}?mangaId=${mangaId}`}
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/30 transition-all"
            >
              <span>Lanjut ke Chapter {nextChapter.chapter}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-900">
              Kamu telah membaca chapter terbaru!
            </span>
          )}

          {mangaId && (
            <Link
              href={`/manga/${mangaId}`}
              onClick={e => e.stopPropagation()}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Kembali ke Daftar Chapter
            </Link>
          )}
        </div>
      </main>

      {/* Slide-over Chapter Drawer Modal */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-xs h-full bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <span className="text-xs font-bold text-zinc-200">Pilih Chapter</span>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 no-scrollbar">
              {ascChapters.map(ch => {
                const isCurrent = ch.id === chapterId;
                return (
                  <Link
                    key={ch.id}
                    href={`/chapter/${ch.id}?mangaId=${mangaId}`}
                    onClick={() => setIsDrawerOpen(false)}
                    className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-colors ${
                      isCurrent
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-zinc-900/60 text-zinc-300 hover:bg-zinc-850'
                    }`}
                  >
                    <span>Chapter {ch.chapter}</span>
                    {isCurrent && <Check className="w-3.5 h-3.5" />}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
