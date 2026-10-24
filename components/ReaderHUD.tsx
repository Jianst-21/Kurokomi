'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Menu, ArrowLeft, ChevronDown } from 'lucide-react';

interface ReaderHUDProps {
  visible: boolean;
  comicTitle: string;
  currentChapter: string;
  mangaId: string;
  prevChapterId?: string;
  prevChapterNumber?: string;
  nextChapterId?: string;
  nextChapterNumber?: string;
  onOpenDrawer: () => void;
}

export function ReaderHUD({
  visible,
  comicTitle,
  currentChapter,
  mangaId,
  prevChapterId,
  prevChapterNumber,
  nextChapterId,
  nextChapterNumber,
  onOpenDrawer,
}: ReaderHUDProps) {
  return (
    <>
      {/* Floating Top Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 transition-all duration-200 ${
          visible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-md mx-auto flex items-center justify-between">
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
              Chapter {currentChapter} • Sub Indo
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

      {/* Floating Bottom Bar: < {angka} > */}
      <footer
        className={`fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/80 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-all duration-200 ${
          visible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
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
      </footer>
    </>
  );
}
