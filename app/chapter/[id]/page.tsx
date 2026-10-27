'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { ChapterItem, ChapterPageItem, ComicDetail } from '@/lib/types';
import {
  fetchChapterPages,
  fetchComicChapters,
  fetchComicDetail,
  fetchMangaIdFromChapter,
  sortChapters,
} from '@/lib/mangadex';
import { fetchUnifiedComicDetail, fetchUnifiedChapters } from '@/lib/aggregator';
import { saveHistory } from '@/lib/storage';
import {
  ReaderMode,
  getPagedTouchZone,
  getSwipeDirection,
  getNextPageIndex,
  getPrevPageIndex,
  getStoredReaderMode,
  setStoredReaderMode,
} from '@/lib/paged-reader';
import { ReaderHUD } from '@/components/ReaderHUD';
import { ReaderImage } from '@/components/ReaderImage';

export default function ReaderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawChapterId = params?.id as string;
  const chapterId = decodeURIComponent(rawChapterId || '');
  const initialMangaId = searchParams.get('mangaId') || '';

  const [mangaId, setMangaId] = useState(initialMangaId);
  const [pages, setPages] = useState<ChapterPageItem[]>([]);
  const [comic, setComic] = useState<ComicDetail | null>(null);
  const [chapters, setChapters] = useState<ChapterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hudVisible, setHudVisible] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [readProgress, setReadProgress] = useState(0);

  // Manga Paged Mode States
  const [readerMode, setReaderMode] = useState<ReaderMode>('webtoon');
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    setReaderMode(getStoredReaderMode());
  }, []);

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

      // Resolve comic metadata and chapters
      let targetMangaId = mangaId;
      if (!targetMangaId) {
        if (chapterId.startsWith('softkomik--')) {
          const raw = chapterId.replace(/^softkomik--/, '');
          const slug = raw.split('__')[0];
          if (slug) {
            targetMangaId = `softkomik--${slug}`;
            setMangaId(targetMangaId);
          }
        } else if (chapterId.startsWith('komiku--')) {
          const raw = chapterId.replace(/^komiku--/, '');
          const slug = raw.replace(/-chapter-[0-9.]+.*$/i, '');
          if (slug) {
            targetMangaId = `komiku--${slug}`;
            setMangaId(targetMangaId);
          }
        } else if (chapterId.startsWith('komikindo--')) {
          const raw = chapterId.replace(/^komikindo--/, '');
          const slug = raw.replace(/-chapter-[0-9.]+.*$/i, '');
          if (slug) {
            targetMangaId = `komikindo--${slug}`;
            setMangaId(targetMangaId);
          }
        } else if (chapterId.startsWith('mangapill--')) {
          const raw = chapterId.replace(/^mangapill--/, '');
          const parts = raw.split('___');
          const slugPart = parts[parts.length - 1] || '';
          const cleanSlug = slugPart.replace(/-chapter-[0-9.]+.*$/i, '');
          if (cleanSlug) {
            targetMangaId = `mangapill--${cleanSlug}`;
            setMangaId(targetMangaId);
          }
        } else {
          const resolved = await fetchMangaIdFromChapter(chapterId);
          if (resolved) {
            targetMangaId = resolved;
            setMangaId(resolved);
          }
        }
      }

      if (targetMangaId) {
        const detailData = comic || (await fetchUnifiedComicDetail(targetMangaId));
        if (detailData) {
          setComic(detailData);

          let activeList = chapters;
          if (activeList.length === 0) {
            const { idChapters, enChapters } = await fetchUnifiedChapters(detailData);
            activeList = enChapters.some(c => c.id === chapterId)
              ? enChapters
              : (idChapters.length > 0 ? idChapters : enChapters);

            if (activeList.length > 0) {
              setChapters(activeList);
            }
          }

          // Extract chapter number for history
          const numMatch = chapterId.match(/chapter-([0-9.]+)/i);
          const currentCh = activeList.find(c => c.id === chapterId);
          const chNum = currentCh?.chapter || (numMatch ? numMatch[1] : '1');

          saveHistory({
            mangaId: detailData.id,
            title: detailData.title,
            coverUrl: detailData.coverUrl,
            type: detailData.type,
            chapterId: chapterId,
            chapterNumber: chNum,
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
    setCurrentPageIndex(0);
  }, [chapterId]);

  const isManga = comic?.type === 'manga';
  const effectiveMode: ReaderMode = isManga ? readerMode : 'webtoon';

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

  const handleNextPage = () => {
    const next = getNextPageIndex(currentPageIndex, pages.length);
    if (next === 'next-chapter') {
      if (nextChapter) {
        router.push(`/chapter/${nextChapter.id}?mangaId=${mangaId}`);
      }
    } else {
      setCurrentPageIndex(next);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handlePrevPage = () => {
    const prev = getPrevPageIndex(currentPageIndex);
    if (prev === 'prev-chapter') {
      if (prevChapter) {
        router.push(`/chapter/${prevChapter.id}?mangaId=${mangaId}`);
      }
    } else {
      setCurrentPageIndex(prev);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleModeChange = (mode: ReaderMode) => {
    setReaderMode(mode);
    setStoredReaderMode(mode);
    setCurrentPageIndex(0);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handlePagedClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const zone = getPagedTouchZone(clickX, rect.width);
    if (zone === 'left') {
      handlePrevPage();
    } else if (zone === 'right') {
      handleNextPage();
    } else {
      toggleHUD();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffY = Math.abs(endY - touchStartY.current);

    if (diffY < 60) {
      const dir = getSwipeDirection(touchStartX.current, endX);
      if (dir === 'next') {
        handleNextPage();
      } else if (dir === 'prev') {
        handlePrevPage();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleWebtoonTap = () => {
    toggleHUD();
  };

  // Prevent background scroll bleed-through when chapter drawer is open on iOS
  useEffect(() => {
    if (!isDrawerOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isDrawerOpen]);

  // Auto-hide HUD after 2.5s on initial chapter load
  useEffect(() => {
    if (!isLoading && pages.length > 0) {
      const timer = setTimeout(() => {
        setHudVisible(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, pages.length]);

  // Auto-hide HUD smoothly whenever user scrolls (rAF throttled for 120Hz ProMotion iOS)
  useEffect(() => {
    let lastScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    let ticking = false;
    let lastReportedProgress = -1;

    const updateScrollMetrics = () => {
      const currentScrollY = window.scrollY;
      if (Math.abs(currentScrollY - lastScrollY) > 10) {
        setHudVisible(false);
        lastScrollY = currentScrollY;
      }
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const pct = Math.round((currentScrollY / scrollHeight) * 100);
        const clampedPct = Math.min(100, Math.max(0, pct));
        if (Math.abs(clampedPct - lastReportedProgress) >= 2 || clampedPct === 0 || clampedPct === 100) {
          lastReportedProgress = clampedPct;
          setReadProgress(clampedPct);
        }
      }
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollMetrics);
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Keyboard navigation for chapter and page reading
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowLeft' || e.key === '[') {
        if (effectiveMode === 'paged') {
          handlePrevPage();
        } else if (prevChapter) {
          router.push(`/chapter/${prevChapter.id}?mangaId=${mangaId}`);
        }
      } else if (e.key === 'ArrowRight' || e.key === ']') {
        if (effectiveMode === 'paged') {
          handleNextPage();
        } else if (nextChapter) {
          router.push(`/chapter/${nextChapter.id}?mangaId=${mangaId}`);
        }
      } else if (e.key === 'm' || e.key === 'M') {
        setIsDrawerOpen(prev => !prev);
      } else if (e.key === 'h' || e.key === 'H') {
        setHudVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveMode, currentPageIndex, pages.length, prevChapter, nextChapter, mangaId, router]);

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative">
      {/* Floating HUD */}
      <ReaderHUD
        visible={hudVisible}
        comicTitle={comic?.title || 'Komik'}
        currentChapter={currentChapter?.chapter || '?'}
        mangaId={mangaId}
        readProgress={readProgress}
        isManga={isManga}
        readerMode={effectiveMode}
        currentPage={currentPageIndex + 1}
        totalPages={pages.length}
        onModeChange={handleModeChange}
        prevChapterId={prevChapter?.id}
        prevChapterNumber={prevChapter?.chapter}
        nextChapterId={nextChapter?.id}
        nextChapterNumber={nextChapter?.chapter}
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      {/* Reader View: Paged (Single Image Fit) vs Webtoon (Continuous Vertical Scroll) */}
      {effectiveMode === 'paged' ? (
        <main
          onClick={handlePagedClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative flex-1 w-full h-[100dvh] flex items-center justify-center bg-black cursor-pointer select-none overflow-hidden touch-manipulation overscroll-none"
        >
          {pages[currentPageIndex] && (
            <ReaderImage
              key={pages[currentPageIndex].url}
              src={pages[currentPageIndex].url}
              fallbackSrc={pages[currentPageIndex].fallbackUrl}
              pageIndex={currentPageIndex}
              fitContain={true}
            />
          )}

          {/* Minimalist Floating Page Badge in corner */}
          <div className="absolute bottom-4 right-4 px-2.5 py-1 bg-zinc-900/80 backdrop-blur-sm rounded-md border border-zinc-800 text-[11px] text-zinc-300 font-medium tabular-nums pointer-events-none z-20">
            {currentPageIndex + 1} / {pages.length}
          </div>
        </main>
      ) : (
        <main
          onClick={handleWebtoonTap}
          className="reader-container flex-1 max-w-lg mx-auto w-full flex flex-col items-center bg-black cursor-pointer pt-0"
        >
          {pages.map((item, idx) => (
            <ReaderImage
              key={item.url}
              src={item.url}
              fallbackSrc={item.fallbackUrl}
              pageIndex={idx}
            />
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
      )}

      {/* Slide-over Chapter Drawer Modal */}
      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-xs h-[100dvh] bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-zinc-800">
              <span className="text-xs font-bold text-zinc-200">Pilih Chapter</span>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col gap-1.5 no-scrollbar">
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
