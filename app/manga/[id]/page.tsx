'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Play,
  Palette,
  User,
  Calendar,
  AlertCircle,
  RefreshCw,
  Languages,
} from 'lucide-react';
import { ComicDetail, ChapterItem } from '@/lib/types';
import { fetchUnifiedComicDetail, fetchUnifiedChapters } from '@/lib/aggregator';
import { toggleFavorite, isFavorite, getComicLastRead } from '@/lib/storage';
import { filterSafeGenres } from '@/lib/security';
import { ChapterList } from '@/components/ChapterList';
import { BottomNav } from '@/components/BottomNav';

function DetailCoverImage({ coverUrl, title }: { coverUrl: string; title: string }) {
  const [imgSrc, setImgSrc] = useState(coverUrl);
  const [hasTriedProxy, setHasTriedProxy] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setImgSrc(coverUrl);
    setHasTriedProxy(false);
    setError(false);
  }, [coverUrl]);

  const handleImgError = () => {
    if (!hasTriedProxy && coverUrl && !imgSrc.startsWith('/api/image-proxy')) {
      setHasTriedProxy(true);
      setImgSrc(`/api/image-proxy?url=${encodeURIComponent(coverUrl)}`);
    } else {
      setError(true);
    }
  };

  if (!imgSrc || error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-zinc-600">
        <BookOpen className="w-8 h-8 opacity-40" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={title}
      referrerPolicy="no-referrer"
      onError={handleImgError}
      className="w-full h-full object-cover"
    />
  );
}

export default function MangaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const mangaId = params?.id as string;

  const [comic, setComic] = useState<ComicDetail | null>(null);
  const [idChapters, setIdChapters] = useState<ChapterItem[]>([]);
  const [enChapters, setEnChapters] = useState<ChapterItem[]>([]);
  const [selectedLang, setSelectedLang] = useState<'id' | 'en'>('id');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [lastReadChapter, setLastReadChapter] = useState<{ chapterId: string; chapterNumber: string } | null>(null);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);

  const loadData = async () => {
    if (!mangaId) return;
    setIsLoading(true);
    setError(null);

    try {
      const detailData = await fetchUnifiedComicDetail(mangaId);
      if (!detailData) {
        setError('Komik tidak ditemukan atau telah dihapus.');
        setIsLoading(false);
        return;
      }

      setComic(detailData);
      setFavorited(isFavorite(mangaId));

      const historyItem = getComicLastRead(mangaId);
      if (historyItem) {
        setLastReadChapter({
          chapterId: historyItem.chapterId,
          chapterNumber: historyItem.chapterNumber,
        });
      }

      // Fetch unified Indonesian chapters (merged Komiku + Komikindo + MangaDex) and English chapters
      const { idChapters: mergedIdChapters, enChapters: mdEnChaps } = await fetchUnifiedChapters(detailData);

      setIdChapters(mergedIdChapters);
      setEnChapters(mdEnChaps);

      // Prioritize Indonesian if chapters exist; otherwise fallback to English
      if (mergedIdChapters.length > 0) {
        setSelectedLang('id');
      } else if (mdEnChaps.length > 0) {
        setSelectedLang('en');
      }
    } catch {
      setError('Gagal memuat detail komik. Silakan coba kembali.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [mangaId]);

  const handleToggleFavorite = () => {
    if (!comic) return;
    const newState = toggleFavorite({
      id: comic.id,
      title: comic.title,
      coverUrl: comic.coverUrl,
      type: comic.type,
      isFullColor: comic.isFullColor,
    });
    setFavorited(newState);
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && document.referrer && document.referrer.includes('/search')) {
      router.push('/search');
    } else {
      router.push('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 gap-3">
        <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
        <span className="text-xs text-zinc-400">Memuat detail komik...</span>
      </div>
    );
  }

  if (error || !comic) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <p className="text-sm text-zinc-300 max-w-xs">{error || 'Komik tidak ditemukan'}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 border border-zinc-800 text-xs font-medium rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>
          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba Lagi</span>
          </button>
        </div>
      </div>
    );
  }

  const activeChapters = selectedLang === 'id' ? idChapters : enChapters;
  const firstChapter = activeChapters.length > 0 ? activeChapters[activeChapters.length - 1] : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col pb-28">
      {/* Top Floating App Bar */}
      <header className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
        <button
          onClick={handleBack}
          aria-label="Kembali"
          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xs font-bold text-zinc-200 line-clamp-1 max-w-[200px] text-center">
          {comic.title}
        </h1>
        <button
          onClick={handleToggleFavorite}
          aria-label="Favorit"
          className={`p-1.5 rounded-lg border transition-colors ${
            favorited
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Bookmark className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`} />
        </button>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto w-full px-4 pt-4 flex flex-col gap-5">
        {/* Comic Presentation Card */}
        <div className="flex gap-4 items-start">
          {/* Cover Image */}
          <div className="w-28 shrink-0 aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-lg relative">
            <DetailCoverImage coverUrl={comic.coverUrl} title={comic.title} />
          </div>

          {/* Details Column */}
          <div className="flex flex-col flex-1 min-w-0 gap-1.5">
            <h2 className="text-base font-bold text-zinc-100 leading-snug">
              {comic.title}
            </h2>
            {comic.altTitles && comic.altTitles.filter(t => t !== comic.title).length > 0 && (
              <p className="text-[11px] text-zinc-400 line-clamp-2 italic">
                <span className="text-zinc-500 font-medium not-italic">Alt: </span>
                {comic.altTitles.filter(t => t !== comic.title).slice(0, 3).join(', ')}
              </p>
            )}

            {/* Type & Status Badges */}
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                  comic.type === 'manhwa'
                    ? 'bg-blue-950 text-blue-400 border-blue-900'
                    : comic.type === 'manhua'
                    ? 'bg-amber-950 text-amber-400 border-amber-900'
                    : comic.type === 'manga'
                    ? 'bg-rose-950 text-rose-400 border-rose-900'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                }`}
              >
                {comic.type}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                {comic.status === 'completed' ? 'Tamat' : 'Ongoing'}
              </span>
              {comic.isFullColor && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                  <Palette className="w-2.5 h-2.5" />
                  <span>Warna</span>
                </span>
              )}
            </div>

            {/* Author / Year */}
            <div className="flex flex-col gap-0.5 text-[11px] text-zinc-400 mt-1">
              {comic.author && (
                <div className="flex items-center gap-1 line-clamp-1">
                  <User className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span>{comic.author}</span>
                </div>
              )}
              {comic.year && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-zinc-500 shrink-0" />
                  <span>{comic.year}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Button: Lanjut Baca / Mulai Baca */}
        {lastReadChapter ? (
          <Link
            href={`/chapter/${lastReadChapter.chapterId}?mangaId=${comic.id}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white shadow-md shadow-blue-600/30 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Lanjut Baca Chapter {lastReadChapter.chapterNumber}</span>
          </Link>
        ) : firstChapter ? (
          <Link
            href={`/chapter/${firstChapter.id}?mangaId=${comic.id}`}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white shadow-md shadow-blue-600/30 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Mulai Baca Chapter {firstChapter.chapter}</span>
          </Link>
        ) : null}

        {/* Genres Chips */}
        {comic.genres && filterSafeGenres(comic.genres).length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-zinc-400">Genre:</span>
            <div className="flex flex-wrap gap-1.5">
              {filterSafeGenres(comic.genres).map(g => (
                <Link
                  key={g}
                  href={`/search?genre=${encodeURIComponent(g.toLowerCase())}`}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {g}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Synopsis Section */}
        {comic.description && (
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-xs font-bold text-zinc-300">Sinopsis</span>
            <p
              className={`text-xs text-zinc-400 leading-relaxed ${
                synopsisExpanded ? '' : 'line-clamp-3'
              }`}
            >
              {comic.description}
            </p>
            {comic.description.length > 150 && (
              <button
                onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium self-start mt-0.5"
              >
                {synopsisExpanded ? 'Sembunyikan' : 'Baca Selengkapnya...'}
              </button>
            )}
          </div>
        )}

        {/* Language Selection Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 rounded-xl border border-zinc-800 self-start">
          <button
            onClick={() => setSelectedLang('id')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedLang === 'id'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Indonesia {idChapters.length > 0 ? `(${idChapters.length})` : ''}</span>
          </button>
          <button
            onClick={() => setSelectedLang('en')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedLang === 'en'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>English {enChapters.length > 0 ? `(${enChapters.length})` : ''}</span>
          </button>
        </div>

        {/* Chapter List Section */}
        {activeChapters.length > 0 ? (
          <ChapterList
            mangaId={comic.id}
            chapters={activeChapters}
            lastReadChapterId={lastReadChapter?.chapterId}
          />
        ) : (
          <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 text-center flex flex-col items-center gap-2">
            <p className="text-xs text-zinc-400">
              {selectedLang === 'id'
                ? 'Belum ada chapter Bahasa Indonesia untuk judul ini.'
                : 'Belum ada chapter Bahasa Inggris untuk judul ini.'}
            </p>
            {selectedLang === 'id' && enChapters.length > 0 && (
              <button
                onClick={() => setSelectedLang('en')}
                className="mt-1 text-xs text-blue-400 hover:underline font-semibold"
              >
                Beralih ke English ({enChapters.length} chapter tersedia)
              </button>
            )}
          </div>
        )}
      </main>

      {/* Persistent Bottom Navigation (Home, Search, Favorit, History) */}
      <BottomNav />
    </div>
  );
}
