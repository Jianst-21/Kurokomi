'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Trash2, Play, BookOpen, Compass, X } from 'lucide-react';
import { ReadingHistoryItem } from '@/lib/types';
import { getHistory, clearHistory, removeFromHistory } from '@/lib/storage';
import { BottomNav } from '@/components/BottomNav';
import { DesktopNavbar } from '@/components/DesktopNavbar';

export default function HistoryPage() {
  const [history, setHistory] = useState<ReadingHistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHistory(getHistory());
  }, []);

  const handleClearHistory = () => {
    if (window.confirm('Hapus seluruh riwayat bacaan?')) {
      clearHistory();
      setHistory([]);
    }
  };

  const handleRemoveItem = (e: React.MouseEvent, mangaId: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromHistory(mangaId);
    setHistory(prev => prev.filter(item => item.mangaId !== mangaId));
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 md:pb-12 text-zinc-100 flex flex-col">
      <DesktopNavbar />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 md:hidden">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <h1 className="text-sm font-bold text-zinc-100">Riwayat Bacaan</h1>
          </div>
          {mounted && history.length > 0 && (
            <button
              onClick={handleClearHistory}
              aria-label="Hapus semua riwayat"
              className="flex items-center gap-1 text-[11px] font-medium text-rose-400 hover:text-rose-300 transition-colors p-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 pt-4 md:pt-6">
        {/* Desktop Header Row */}
        <div className="hidden md:flex items-center justify-between mb-6 pb-4 border-b border-zinc-850">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-blue-500" />
            <h1 className="text-lg font-bold text-zinc-100">Riwayat Bacaan</h1>
            {mounted && history.length > 0 && (
              <span className="text-xs text-zinc-400 font-medium">
                ({history.length} bab tercatat)
              </span>
            )}
          </div>
          {mounted && history.length > 0 && (
            <button
              onClick={handleClearHistory}
              aria-label="Hapus semua riwayat"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Riwayat</span>
            </button>
          )}
        </div>

        {mounted && history.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 text-center my-12 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-850 flex items-center justify-center text-zinc-500 border border-zinc-800">
              <Clock className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-zinc-200">Belum Ada Riwayat Bacaan</h2>
            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
              Komik dan bab yang sedang atau telah kamu baca akan otomatis tersimpan di sini agar kamu bisa langsung melanjutkannya kapan saja.
            </p>
            <Link
              href="/"
              className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Mulai Membaca</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.map(item => {
              const formattedDate = item.readAt
                ? new Date(item.readAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <div
                  key={`${item.mangaId}-${item.chapterId}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-850 hover:border-zinc-800 transition-all"
                >
                  {/* Cover Thumbnail */}
                  <Link
                    href={`/manga/${item.mangaId}`}
                    className="w-14 aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800 shrink-0 relative"
                  >
                    {item.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.coverUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <BookOpen className="w-5 h-5 opacity-40" />
                      </div>
                    )}
                  </Link>

                  {/* Info Column */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/manga/${item.mangaId}`}
                          className="text-xs font-bold text-zinc-200 line-clamp-1 hover:text-blue-400 transition-colors"
                        >
                          {item.title}
                        </Link>
                        <div className="text-[11px] text-blue-400 font-semibold mt-0.5">
                          Chapter {item.chapterNumber}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleRemoveItem(e, item.mangaId)}
                        aria-label={`Hapus ${item.title} dari riwayat`}
                        className="p-1 -mr-1 -mt-0.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800/60 transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-zinc-500">
                        {formattedDate}
                      </span>
                      <Link
                        href={`/chapter/${item.chapterId}?mangaId=${item.mangaId}`}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-[11px] font-semibold text-white shadow-sm shadow-blue-600/30 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Lanjut</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
