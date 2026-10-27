'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, AlertCircle, BookOpen } from 'lucide-react';
import { ComicCardItem, ComicType } from '@/lib/types';
import { fetchTopComics } from '@/lib/mangadex';
import { CleanPagination } from './CleanPagination';

const CATEGORIES: Array<{
  id: ComicType;
  label: string;
}> = [
  { id: 'all', label: 'Semua Top' },
  { id: 'manhwa', label: 'Top Manhwa' },
  { id: 'manga', label: 'Top Manga' },
  { id: 'manhua', label: 'Top Manhua' },
];

export function TopComicsSection() {
  const [activeCategory, setActiveCategory] = useState<ComicType>('all');
  const [page, setPage] = useState<number>(1);
  const [comics, setComics] = useState<ComicCardItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const sectionRef = useRef<HTMLElement>(null);
  const cacheRef = useRef<Map<string, ComicCardItem[]>>(new Map());
  const PAGE_LIMIT = 15;

  const scrollToTop = () => {
    if (sectionRef.current && typeof window !== 'undefined') {
      const top = sectionRef.current.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  };

  const loadTopComics = useCallback(async (cat: ComicType, pageNum: number) => {
    const cacheKey = `${cat}-${pageNum}`;
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
      const results = await fetchTopComics(cat, PAGE_LIMIT, offset);
      cacheRef.current.set(cacheKey, results);
      setComics(results);
    } catch {
      setError('Gagal memuat rekomendasi populer.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRetry = () => {
    const cacheKey = `${activeCategory}-${page}`;
    cacheRef.current.delete(cacheKey);
    loadTopComics(activeCategory, page);
  };

  useEffect(() => {
    loadTopComics(activeCategory, page);
  }, [activeCategory, page, loadTopComics]);

  const handleCategoryChange = (cat: ComicType) => {
    if (cat === activeCategory) return;
    setActiveCategory(cat);
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
    <section ref={sectionRef} className="flex flex-col gap-3 pt-2">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-4 rounded-full bg-amber-500" />
          <h2 className="text-sm font-bold text-zinc-100">Top 15 Rekomendasi</h2>
        </div>
        <span className="text-[11px] text-zinc-500">Paling Populer</span>
      </div>

      {/* Filter Chips Bar (Minimalist & Modern) */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
        {CATEGORIES.map(c => {
          const isActive = activeCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => handleCategoryChange(c.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 border transition-all ${
                isActive
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Grid 3 Kolom Content */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-xl bg-zinc-900/60 border border-zinc-850 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="w-full py-8 bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <p className="text-xs text-zinc-400">{error}</p>
          <button
            onClick={handleRetry}
            className="text-xs text-amber-400 font-semibold hover:underline"
          >
            Coba Lagi
          </button>
        </div>
      ) : comics.length === 0 ? (
        <div className="w-full py-8 bg-zinc-900/40 border border-zinc-850 rounded-2xl p-4 flex items-center justify-center text-zinc-500 text-xs">
          Belum ada komik rekomendasi untuk kategori ini.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {comics.map((comic, idx) => {
            const rank = (page - 1) * PAGE_LIMIT + idx + 1;
            const rankBadgeStyle =
              rank === 1
                ? 'bg-amber-500 text-black font-extrabold shadow-md shadow-amber-500/30'
                : rank === 2
                ? 'bg-zinc-300 text-black font-bold'
                : rank === 3
                ? 'bg-amber-700 text-white font-bold'
                : 'bg-zinc-950/80 text-zinc-300 font-semibold border border-zinc-800';

            return (
              <Link
                key={comic.id}
                href={`/manga/${comic.id}`}
                className="flex flex-col gap-1.5 bg-zinc-900/50 hover:bg-zinc-900 rounded-xl p-1.5 border border-zinc-850 hover:border-zinc-750 transition-all group"
              >
                {/* Poster Cover */}
                <div className="aspect-[3/4] rounded-lg overflow-hidden bg-zinc-800 relative shadow-sm">
                  {comic.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={comic.coverUrl}
                      alt={comic.title}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <BookOpen className="w-5 h-5 stroke-1" />
                    </div>
                  )}

                  {/* Rank Badge */}
                  <span
                    className={`absolute top-1 left-1 text-[9px] px-1.5 py-0.2 rounded ${rankBadgeStyle}`}
                  >
                    #{rank}
                  </span>
                </div>

                {/* Title & Info */}
                <h4 className="text-[11px] font-semibold text-zinc-200 line-clamp-1 leading-snug group-hover:text-amber-400 transition-colors">
                  {comic.title}
                </h4>

                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-zinc-500 uppercase font-medium">
                    {comic.type}
                  </span>
                  {comic.latestChapter && (
                    <span className="text-blue-400 font-semibold">
                      {comic.latestChapter}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Clean Pagination (1 Angka Bersih) */}
      <CleanPagination
        page={page}
        hasPrev={page > 1 && !isLoading}
        hasNext={comics.length === PAGE_LIMIT && !isLoading}
        onPrev={handlePrev}
        onNext={handleNext}
        activeColorClass="text-amber-400"
      />
    </section>
  );
}
