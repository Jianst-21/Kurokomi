'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Menu, ArrowLeft, ChevronDown, ArrowUp } from 'lucide-react';

interface ReaderHUDProps {
  visible: boolean;
  comicTitle: string;
  currentChapter: string;
  mangaId: string;
  readProgress?: number;
  isManga?: boolean;
  readerMode?: 'webtoon' | 'paged';
  currentPage?: number;
  totalPages?: number;
  onModeChange?: (mode: 'webtoon' | 'paged') => void;
  prevChapterId?: string;
  prevChapterNumber?: string;
  nextChapterId?: string;
  nextChapterNumber?: string;
  onOpenDrawer: () => void;
  onScrollToTop?: () => void;
}

export function ReaderHUD({
  visible,
  comicTitle,
  currentChapter,
  mangaId,
  readProgress,
  isManga,
  readerMode = 'webtoon',
  currentPage,
  totalPages,
  onModeChange,
  prevChapterId,
  prevChapterNumber,
  nextChapterId,
  nextChapterNumber,
  onOpenDrawer,
  onScrollToTop,
}: ReaderHUDProps) {
  return (
    <>
      {/* Floating Slim Reading Progress Bar at Top */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-zinc-900/40 pointer-events-none">
        <div
          className="h-full bg-blue-500 transition-[width] duration-75 ease-out"
          style={{
            width: readerMode === 'paged' && currentPage && totalPages
              ? `${(currentPage / totalPages) * 100}%`
              : `${Math.min(100, Math.max(0, readProgress ?? 0))}%`
          }}
        />
      </div>

      {/* Floating Top Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 transition-all duration-200 ${
          visible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href={`/manga/${mangaId}`}
            aria-label="Kembali ke detail"
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex flex-col items-center max-w-[200px] text-center">
            <span className="text-xs font-bold text-zinc-100 line-clamp-1">
              {comicTitle}
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">
              Chapter {currentChapter} • {readerMode === 'paged' && currentPage && totalPages ? (
                <span>{currentPage} / {totalPages}</span>
              ) : (readProgress !== undefined && readProgress > 0 ? `${readProgress}%` : 'Sub Indo')}
            </span>
          </div>

          <button
            onClick={onOpenDrawer}
            aria-label="Buka daftar chapter"
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Floating Bottom Bar */}
      <footer
        className={`fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-all duration-200 ${
          visible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          {/* Reader Mode Toggle (Minimalist - Only for Manga) */}
          {isManga && onModeChange && (
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center bg-zinc-900 border border-zinc-800/90 rounded-lg p-0.5 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => onModeChange('webtoon')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    readerMode === 'webtoon'
                      ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Webtoon
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange('paged')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    readerMode === 'paged'
                      ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/30'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Lembar
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            {/* Prev Chapter Button */}
            {prevChapterId ? (
              <Link
                href={`/chapter/${prevChapterId}?mangaId=${mangaId}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Ch. {prevChapterNumber || 'Prev'}</span>
              </Link>
            ) : (
              <div className="w-20" />
            )}

            {/* Current Chapter Badge / Selector */}
            <button
              onClick={onOpenDrawer}
              aria-label="Pilih chapter"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all shrink-0"
            >
              <span>Ch. {currentChapter}</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {/* Next Chapter Button */}
            {nextChapterId ? (
              <Link
                href={`/chapter/${nextChapterId}?mangaId=${mangaId}`}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <span>Ch. {nextChapterNumber || 'Next'}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <div className="w-20" />
            )}
          </div>
        </div>
      </footer>

      {/* Floating Scroll to Top Button (Icon-only, synchronized with HUD visibility) */}
      <div
        className={`fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-40 transition-all duration-200 ${
          visible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-4 opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onScrollToTop?.();
          }}
          aria-label="Kembali ke atas"
          className="flex items-center justify-center w-11 h-11 rounded-full bg-zinc-900/95 border border-zinc-700/80 text-zinc-300 hover:text-white hover:bg-zinc-800 shadow-xl shadow-black/50 backdrop-blur-md transition-all active:scale-95 touch-manipulation cursor-pointer"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>
    </>
  );
}
