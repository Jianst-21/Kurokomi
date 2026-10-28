'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock, BookOpen, Check, Heart } from 'lucide-react';
import { ComicCardItem, ReadingHistoryItem } from '@/lib/types';
import { formatChapterDate } from '@/lib/date';
import { getComicLastRead, isFavorite } from '@/lib/storage';

interface HorizontalComicCardProps {
  comic: ComicCardItem;
}

export function HorizontalComicCard({ comic }: HorizontalComicCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgSrc, setImgSrc] = useState(comic.coverUrl);
  const [hasTriedProxy, setHasTriedProxy] = useState(false);
  const [lastRead, setLastRead] = useState<ReadingHistoryItem | undefined>(undefined);
  const [favorited, setFavorited] = useState<boolean>(false);

  useEffect(() => {
    setImgSrc(comic.coverUrl);
    setHasTriedProxy(false);
    setImgError(false);
  }, [comic.coverUrl]);

  useEffect(() => {
    setLastRead(getComicLastRead(comic.id));
    setFavorited(isFavorite(comic.id));
  }, [comic.id]);

  const handleImgError = () => {
    if (!hasTriedProxy && comic.coverUrl && !imgSrc.startsWith('/api/image-proxy')) {
      setHasTriedProxy(true);
      setImgSrc(`/api/image-proxy?url=${encodeURIComponent(comic.coverUrl)}`);
    } else {
      setImgError(true);
    }
  };

  const formattedDate = comic.updatedAt
    ? comic.updatedAt.includes('lalu')
      ? comic.updatedAt
      : formatChapterDate(comic.updatedAt)
    : '';

  const typeBadgeColors: Record<string, string> = {
    manga: 'bg-rose-950 text-rose-400 border-rose-900',
    manhwa: 'bg-blue-950 text-blue-400 border-blue-900',
    manhua: 'bg-amber-950 text-amber-400 border-amber-900',
    other: 'bg-zinc-900 text-zinc-400 border-zinc-800',
  };

  // Subtle ambient background tint and borders per provider source
  const sourceAmbientStyles: Record<string, string> = {
    komiku: 'border-amber-900/60 hover:border-amber-700/80 bg-gradient-to-r from-amber-950/20 via-zinc-900/95 to-zinc-900/90',
    softkomik: 'border-indigo-900/60 hover:border-indigo-700/80 bg-gradient-to-r from-indigo-950/20 via-zinc-900/95 to-zinc-900/90',
    komikindo: 'border-emerald-900/60 hover:border-emerald-700/80 bg-gradient-to-r from-emerald-950/20 via-zinc-900/95 to-zinc-900/90',
  };

  const badgeStyle = typeBadgeColors[comic.type] || typeBadgeColors.other;
  const isRead = Boolean(lastRead);
  const ambientClass = (comic.source && sourceAmbientStyles[comic.source]) || 'border-zinc-800 hover:border-zinc-750 bg-zinc-900/90';

  return (
    <Link
      href={`/manga/${comic.id}`}
      aria-label={comic.title}
      className={`w-full rounded-2xl p-3 flex gap-3 shadow-lg transition-all group border relative ${
        isRead
          ? 'bg-blue-950/20 border-blue-900/60 hover:border-blue-700/80 shadow-blue-950/20'
          : ambientClass
      }`}
    >
      {/* Left: Comic Cover Poster */}
      <div className="w-24 h-32 shrink-0 rounded-xl overflow-hidden bg-zinc-850 border border-zinc-750/60 relative shadow-md">
        {imgSrc && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={comic.title}
            onError={handleImgError}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-zinc-500 gap-1 bg-zinc-900">
            <BookOpen className="w-6 h-6 stroke-1 text-zinc-600" />
            <span className="text-[9px] line-clamp-2 leading-tight">
              {comic.title}
            </span>
          </div>
        )}

        {/* Minimalist Heart Icon if Favorited */}
        {favorited && (
          <div
            aria-label="Komik Favorit"
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center shadow-md border border-rose-500/40"
          >
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
          </div>
        )}
      </div>

      {/* Right: Info Details */}
      <div className="flex flex-col flex-1 justify-between min-w-0">
        <div className="flex flex-col gap-1">
          {/* Top row: Type badge, Chapter & Update Date */}
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${badgeStyle}`}
              >
                {comic.type}
              </span>

              {comic.latestChapter ? (
                <span className="text-[10px] font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-900/80 line-clamp-1">
                  {comic.latestChapter}
                </span>
              ) : (
                <span className="text-[10px] font-medium text-zinc-400 bg-zinc-800/70 px-1.5 py-0.5 rounded">
                  Update Baru
                </span>
              )}

              {isRead && (
                <span className="text-[9px] font-semibold text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-900/80 flex items-center gap-0.5">
                  <Check className="w-2.5 h-2.5" />
                  <span>Ch. {lastRead?.chapterNumber}</span>
                </span>
              )}
            </div>

            {formattedDate && (
              <span className="text-[10px] text-zinc-400 flex items-center gap-1 shrink-0">
                <Clock className="w-2.5 h-2.5" />
                <span>{formattedDate}</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            className={`text-xs font-bold line-clamp-2 leading-snug mt-0.5 transition-colors ${
              isRead
                ? 'text-blue-200 group-hover:text-blue-400'
                : 'text-zinc-100 group-hover:text-blue-400'
            }`}
          >
            {comic.title}
          </h3>

          {/* Alt Title Tagline */}
          {comic.altTitle && comic.altTitle !== comic.title && (
            <p className="text-[10px] text-zinc-400 line-clamp-1 italic">
              Alt: {comic.altTitle}
            </p>
          )}

          {/* Genres Chips */}
          {comic.genres && comic.genres.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap mt-0.5">
              {comic.genres.slice(0, 3).map(g => (
                <span
                  key={g}
                  className="text-[9px] bg-zinc-800/80 text-zinc-300 px-1.5 py-0.5 rounded border border-zinc-750"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bottom row: Sub Indo badge & Action Button */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 mt-1">
          <span className="text-[10px] text-zinc-400 font-medium">
            Sub Indo
          </span>
          <div
            className={`px-2.5 py-1 rounded-lg text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition-colors ${
              isRead
                ? 'bg-blue-700 group-hover:bg-blue-600 shadow-blue-700/40'
                : 'bg-blue-600 group-hover:bg-blue-500 shadow-blue-600/30'
            }`}
          >
            <span>{isRead ? `Lanjut Ch. ${lastRead?.chapterNumber}` : 'Baca'}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </Link>
  );
}
