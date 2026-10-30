'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { ComicCardItem, ComicType } from '@/lib/types';
import { fetchLatestComicsByType } from '@/lib/mangadex';
import { getSavedLatestSectionState, saveLatestSectionState, isFavorite, updateFavoriteComic } from '@/lib/storage';
import { HorizontalComicCard } from './HorizontalComicCard';
import { CleanPagination } from './CleanPagination';

const TYPES: Array<{ id: 'manhwa' | 'manga' | 'manhua'; label: string }> = [
  { id: 'manhwa', label: 'Manhwa' },
  { id: 'manga', label: 'Manga' },
  { id: 'manhua', label: 'Manhua' },
];

export function LatestUpdatesSection() {
  const initial = getSavedLatestSectionState();
  const [activeType, setActiveType] = useState<'manhwa' | 'manga' | 'manhua'>(initial.type);
  const [page, setPage] = useState<number>(initial.page);
  const [comics, setComics] = useState<ComicCardItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const sectionRef = useRef<HTMLElement>(null);
  const cacheRef = useRef<Map<string, ComicCardItem[]>>(new Map());
  const PAGE_LIMIT = 10;

  useEffect(() => {
    saveLatestSectionState(activeType, page);
  }, [activeType, page]);

  const scrollToTop = () => {
    if (sectionRef.current && typeof window !== 'undefined') {
      const top = sectionRef.current.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  };

  const loadLatestComics = useCallback(async (type: ComicType, pageNum: number) => {
    const cacheKey = `${type}-${pageNum}`;
    if (cacheRef.current.has(cacheKey)) {
      setComics(cacheRef.current.get(cacheKey)!);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    const offset = (pageNum - 1) * PAGE_LIMIT;

    try {
      const results = await fetchLatestComicsByType(type, PAGE_LIMIT, offset);
      cacheRef.current.set(cacheKey, results);
      setComics(results);

      // Automatically sync latestChapter to favorites if any of these comics are favorited
      results.forEach(c => {
        if (isFavorite(c.id) && c.latestChapter) {
          updateFavoriteComic(c.id, {
            latestChapter: c.latestChapter,
            latestChapterId: c.latestChapterId,
          });
        }
      });
    } catch {
      setError('Gagal memuat update terbaru.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRetry = () => {
    const cacheKey = `${activeType}-${page}`;
    cacheRef.current.delete(cacheKey);
    loadLatestComics(activeType, page);
  };

  useEffect(() => {
    loadLatestComics(activeType, page);
  }, [activeType, page, loadLatestComics]);

  const handleTabChange = (type: 'manhwa' | 'manga' | 'manhua') => {
    if (type === activeType) return;
    setActiveType(type);
    setPage(1);
    scrollToTop();
  };

  const handlePrev = () => {
    setPage(prev => Math.max(1, prev - 1));
    scrollToTop();
  };

  const handleNext = () => {
    setPage(prev => prev + 1);
    scrollToTop();
  };

  return (
    <section ref={sectionRef} className="flex flex-col gap-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-4 rounded-full bg-blue-500" />
          <h2 className="text-sm font-bold text-zinc-100">Update Komik Terbaru</h2>
        </div>
        <span className="text-[11px] text-zinc-500">10 Komik per Halaman</span>
      </div>

      {/* 3 Tab Kategori (Manga / Manhwa / Manhua) */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 rounded-xl border border-zinc-850 text-xs">
        {TYPES.map(t => {
          const isActive = activeType === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`flex-1 py-1.5 rounded-lg text-center font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Horizontal Slider Area */}
      <div className="relative">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex gap-3 bg-zinc-900/60 p-2.5 rounded-2xl border border-zinc-850 animate-pulse"
              >
                <div className="w-24 h-32 shrink-0 rounded-xl bg-zinc-800" />
                <div className="flex flex-col flex-1 gap-2 py-1">
                  <div className="h-4 bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-800/70 rounded w-1/3" />
                  <div className="mt-auto flex flex-col gap-1.5">
                    <div className="h-5 bg-zinc-800/80 rounded-lg w-full" />
                    <div className="h-5 bg-zinc-800/50 rounded-lg w-4/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="w-full h-40 bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <p className="text-xs text-zinc-400">{error}</p>
            <button
              onClick={handleRetry}
              className="text-xs text-blue-400 font-semibold hover:underline"
            >
              Coba Lagi
            </button>
          </div>
        ) : comics.length === 0 ? (
          <div className="w-full h-40 bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 flex items-center justify-center text-zinc-500 text-xs">
            Belum ada update komik untuk kategori ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {comics.map(comic => (
              <HorizontalComicCard key={comic.id} comic={comic} />
            ))}
          </div>
        )}

        {/* Clean Pagination (1 Angka Bersih) */}
        <CleanPagination
          page={page}
          hasPrev={page > 1 && !isLoading}
          hasNext={comics.length === PAGE_LIMIT && !isLoading}
          onPrev={handlePrev}
          onNext={handleNext}
          activeColorClass="text-blue-400"
        />
      </div>
    </section>
  );
}
