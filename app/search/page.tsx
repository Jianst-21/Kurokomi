'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Search, X, SlidersHorizontal, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';
import { ComicCardItem, ComicType } from '@/lib/types';
import { searchComics } from '@/lib/mangadex';
import { ComicCard } from '@/components/ComicCard';
import { BottomNav } from '@/components/BottomNav';
import { SearchFilterModal } from '@/components/SearchFilterModal';

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState<ComicType>('all');
  const [isColor, setIsColor] = useState(false);
  const [activeGenre, setActiveGenre] = useState('');

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [comics, setComics] = useState<ComicCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const isFilterActive = activeType !== 'all' || isColor || Boolean(activeGenre);

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
      const results = await searchComics(searchQuery, {
        type: activeType,
        isColor,
        genre: activeGenre,
        limit: PAGE_LIMIT,
        offset: currentOffset,
      });

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
      setError('Gagal memuat hasil pencarian. Silakan coba kembali.');
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
  }, [searchQuery, activeType, isColor, activeGenre]);

  const handleResetFilters = () => {
    setActiveType('all');
    setIsColor(false);
    setActiveGenre('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 text-zinc-100 flex flex-col">
      {/* Top Search Bar (Only 2 items: Search input on left, Filter icon button on right) */}
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-850 px-4 py-3 shadow-md">
        <div className="max-w-md mx-auto flex items-center gap-2">
          {/* Left: Search Input Box */}
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari judul komik (contoh: Solo Leveling)..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-9 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-600 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Hapus teks pencarian"
                className="absolute right-3 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Filter Icon Button */}
          <button
            onClick={() => setIsFilterOpen(true)}
            aria-label="Buka filter pencarian"
            className={`relative p-2.5 rounded-xl border transition-all shrink-0 ${
              isFilterActive
                ? 'bg-blue-600 border-blue-500 text-white shadow-sm shadow-blue-600/30'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {isFilterActive && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-zinc-950" />
            )}
          </button>
        </div>
      </header>

      {/* Main Results Area */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-3">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            {searchQuery.trim()
              ? `Hasil Pencarian "${searchQuery.trim()}"`
              : isFilterActive
              ? 'Hasil Filter'
              : 'Jelajah Seluruh Komik'}
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
              Coba periksa ejaan judul komik atau ubah filter yang sedang aktif.
            </p>
            {(searchQuery || isFilterActive) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  handleResetFilters();
                }}
                className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300 underline underline-offset-4"
              >
                Reset Pencarian & Filter
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

      {/* Filter Modal Dialog */}
      <SearchFilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        activeType={activeType}
        isColor={isColor}
        activeGenre={activeGenre}
        onTypeChange={setActiveType}
        onColorToggle={() => setIsColor(!isColor)}
        onGenreChange={setActiveGenre}
        onReset={handleResetFilters}
      />

      {/* Bottom Nav with 4 items: Home, Search, Favorit, History */}
      <BottomNav />
    </div>
  );
}
