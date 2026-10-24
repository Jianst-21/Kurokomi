'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Search, X, RefreshCw, AlertCircle, Flame, Clock, ChevronDown } from 'lucide-react';
import { ComicCardItem, ComicType } from '@/lib/types';
import { fetchLatestUpdates, searchComics } from '@/lib/mangadex';
import { FilterBar } from '@/components/FilterBar';
import { ComicCard } from '@/components/ComicCard';
import { BottomNav } from '@/components/BottomNav';

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState<ComicType>('all');
  const [isColor, setIsColor] = useState(false);
  const [activeGenre, setActiveGenre] = useState('');

  const [feedMode, setFeedMode] = useState<'popular' | 'latest'>('popular');
  const [comics, setComics] = useState<ComicCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isFiltering = Boolean(searchQuery.trim() || activeType !== 'all' || isColor || activeGenre);

  const getSectionTitle = () => {
    if (searchQuery.trim()) {
      return `Hasil Pencarian "${searchQuery.trim()}"`;
    }
    if (activeType === 'manga') {
      return 'Top Manga Populer';
    }
    if (activeType === 'manhwa') {
      return 'Top Manhwa Populer';
    }
    if (activeType === 'manhua') {
      return 'Top Manhua Populer';
    }
    if (activeGenre || isColor) {
      return 'Hasil Filter Komik';
    }
    return feedMode === 'popular' ? 'Rekomendasi Pilihan' : 'Rilis Terbaru Hari Ini';
  };

  const loadData = async (reset: boolean = true) => {
    if (reset) {
      setIsLoading(true);
      setError(null);
      setOffset(0);
      setHasMore(true);
    } else {
      setIsLoadingMore(true);
    }

    const currentOffset = reset ? 0 : offset;
    const PAGE_LIMIT = 30;

    try {
      let results: ComicCardItem[] = [];

      if (isFiltering || feedMode === 'popular') {
        results = await searchComics(searchQuery, {
          type: activeType,
          isColor,
          genre: activeGenre,
          limit: PAGE_LIMIT,
          offset: currentOffset,
        });
      } else {
        // Latest updates feed
        results = await fetchLatestUpdates(60, currentOffset);
      }

      if (reset) {
        setComics(results);
      } else {
        setComics(prev => {
          const existingIds = new Set(prev.map(c => c.id));
          const uniqueNew = results.filter(c => !existingIds.has(c.id));
          return [...prev, ...uniqueNew];
        });
      }

      setOffset(currentOffset + PAGE_LIMIT);
      setHasMore(results.length >= 10);
    } catch {
      setError('Gagal memuat data komik. Silakan coba kembali.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        loadData(true);
      });
    }, searchQuery ? 400 : 0);

    return () => clearTimeout(timer);
  }, [searchQuery, activeType, isColor, activeGenre, feedMode]);

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 text-zinc-100 flex flex-col">
      {/* Top App Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3">
        <div className="max-w-md mx-auto flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-wider bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                KUROKOMI
              </span>
              <span className="text-[10px] font-semibold bg-zinc-800 text-blue-400 border border-zinc-700 px-1.5 py-0.5 rounded-full">
                ID Sub
              </span>
            </div>
            <button
              onClick={() => loadData(true)}
              aria-label="Segarkan"
              className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari komik (contoh: Solo Leveling, One Piece)..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-9 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-600 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Hapus pencarian"
                className="absolute right-3 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Bar */}
          <FilterBar
            activeType={activeType}
            isColor={isColor}
            activeGenre={activeGenre}
            onTypeChange={setActiveType}
            onColorToggle={() => setIsColor(!isColor)}
            onGenreChange={setActiveGenre}
          />

          {/* Tab Mode (Rekomendasi vs Terbaru) - only on Home without search */}
          {!searchQuery.trim() && activeType === 'all' && (
            <div className="flex items-center gap-2 pt-1 border-t border-zinc-850">
              <button
                onClick={() => setFeedMode('popular')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  feedMode === 'popular'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Rekomendasi</span>
              </button>

              <button
                onClick={() => setFeedMode('latest')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  feedMode === 'latest'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Rilis Terbaru</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-3">
        {/* Section Title */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            {getSectionTitle()}
          </h2>
          <span className="text-[11px] text-zinc-500 font-medium">
            {isLoading ? 'Memuat...' : `${comics.length} judul`}
          </span>
        </div>

        {/* Loading Skeletons */}
        {isLoading && comics.length === 0 && (
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 rounded-xl bg-zinc-900/60 p-1.5 border border-zinc-800/60 animate-pulse"
              >
                <div className="aspect-[3/4] w-full bg-zinc-800 rounded-lg" />
                <div className="h-3 w-4/5 bg-zinc-800 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 text-center my-6 gap-3">
            <AlertCircle className="w-8 h-8 text-rose-400" />
            <p className="text-xs text-zinc-300">{error}</p>
            <button
              onClick={() => loadData(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && comics.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/40 rounded-2xl border border-zinc-800/80 text-center my-6 gap-2">
            <span className="text-sm font-semibold text-zinc-300">Tidak ada komik yang ditemukan</span>
            <p className="text-xs text-zinc-500 max-w-xs">
              Coba ganti kata kunci pencarian atau ubah kombinasi filter genre/tipe.
            </p>
            {isFiltering && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveType('all');
                  setIsColor(false);
                  setActiveGenre('');
                }}
                className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300 underline underline-offset-4"
              >
                Reset Semua Filter
              </button>
            )}
          </div>
        )}

        {/* Comics Grid */}
        {comics.length > 0 && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2.5">
              {comics.map(comic => (
                <ComicCard key={comic.id} comic={comic} />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && !isLoading && (
              <div className="flex justify-center pt-2 pb-4">
                <button
                  onClick={() => loadData(false)}
                  disabled={isLoadingMore}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {isLoadingMore ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                      <span>Memuat judul berikutnya...</span>
                    </>
                  ) : (
                    <>
                      <span>Muat Lebih Banyak</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
