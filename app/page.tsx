'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { RefreshCw, AlertCircle, ChevronDown, Flame, BookOpen, Crown, Clock } from 'lucide-react';
import { ComicCardItem, ComicType } from '@/lib/types';
import { fetchLatestUpdates, searchComics } from '@/lib/mangadex';
import { ComicCard } from '@/components/ComicCard';
import { BottomNav } from '@/components/BottomNav';

type HomeCategory = 'recommended' | 'manga' | 'manhwa' | 'manhua' | 'latest';

interface CategoryTab {
  id: HomeCategory;
  label: string;
  icon: React.ElementType;
}

const CATEGORIES: CategoryTab[] = [
  { id: 'recommended', label: 'Rekomendasi', icon: Flame },
  { id: 'manhwa', label: 'Top Manhwa', icon: Crown },
  { id: 'manga', label: 'Top Manga', icon: BookOpen },
  { id: 'manhua', label: 'Top Manhua', icon: Crown },
  { id: 'latest', label: 'Rilis Terbaru', icon: Clock },
];

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<HomeCategory>('recommended');
  const [comics, setComics] = useState<ComicCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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

      if (activeCategory === 'latest') {
        results = await fetchLatestUpdates(60, currentOffset);
      } else {
        let type: ComicType | undefined = undefined;
        if (activeCategory === 'manga') type = 'manga';
        if (activeCategory === 'manhwa') type = 'manhwa';
        if (activeCategory === 'manhua') type = 'manhua';

        results = await searchComics('', {
          type,
          limit: PAGE_LIMIT,
          offset: currentOffset,
        });
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
      setError('Gagal memuat komik. Silakan coba kembali.');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      loadData(true);
    });
  }, [activeCategory]);

  const getCategoryTitle = () => {
    switch (activeCategory) {
      case 'recommended':
        return 'Rekomendasi Populer';
      case 'manhwa':
        return 'Peringkat Top Manhwa (Korea)';
      case 'manga':
        return 'Peringkat Top Manga (Jepang)';
      case 'manhua':
        return 'Peringkat Top Manhua (China)';
      case 'latest':
        return 'Rilis Terbaru Hari Ini';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 text-zinc-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-850 px-4 py-3 shadow-md">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold tracking-wider bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                KUROKOMI
              </span>
              <span className="text-[10px] font-semibold bg-zinc-850 text-blue-400 border border-zinc-750 px-2 py-0.5 rounded-full">
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

          {/* Top Category Segment Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-3">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            {getCategoryTitle()}
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
              Silakan coba muat ulang atau pilih kategori lain.
            </p>
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

      {/* Bottom Nav with 4 items: Home, Search, Favorit, History */}
      <BottomNav />
    </div>
  );
}
