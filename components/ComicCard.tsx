'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Palette, BookOpen, Check } from 'lucide-react';
import { ComicCardItem } from '@/lib/types';
import { getComicLastRead } from '@/lib/storage';

interface ComicCardProps {
  comic: ComicCardItem;
}

export function ComicCard({ comic }: ComicCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imgSrc, setImgSrc] = useState(comic.coverUrl);
  const [hasTriedProxy, setHasTriedProxy] = useState(false);
  const [hasRead, setHasRead] = useState(false);

  useEffect(() => {
    setImgSrc(comic.coverUrl);
    setHasTriedProxy(false);
    setImageError(false);
  }, [comic.coverUrl]);

  useEffect(() => {
    setHasRead(Boolean(getComicLastRead(comic.id)));
  }, [comic.id]);

  const handleImageError = () => {
    if (!hasTriedProxy && comic.coverUrl && !imgSrc.startsWith('/api/image-proxy')) {
      setHasTriedProxy(true);
      setImgSrc(`/api/image-proxy?url=${encodeURIComponent(comic.coverUrl)}`);
    } else {
      setImageError(true);
    }
  };

  const typeLabels: Record<string, { label: string; color: string }> = {
    manhwa: { label: 'Manhwa', color: 'bg-emerald-950 text-emerald-400 border-emerald-800' },
    manga: { label: 'Manga', color: 'bg-blue-950 text-blue-400 border-blue-800' },
    manhua: { label: 'Manhua', color: 'bg-amber-950 text-amber-400 border-amber-800' },
    other: { label: 'Komik', color: 'bg-zinc-850 text-zinc-300 border-zinc-700' },
  };

  const typeInfo = typeLabels[comic.type] || typeLabels.other;

  return (
    <Link
      href={`/manga/${comic.id}`}
      className={`comic-grid-card group flex flex-col rounded-xl overflow-hidden border transition-all active:bg-zinc-850 ${
        hasRead
          ? 'bg-blue-950/20 border-blue-900/60 shadow-sm shadow-blue-950/20'
          : 'bg-zinc-900/70 border-zinc-800/80'
      }`}
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] w-full bg-zinc-950 overflow-hidden">
        {imgSrc && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={comic.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={handleImageError}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-600 gap-2 p-3 text-center">
            <BookOpen className="w-8 h-8 opacity-40" />
            <span className="text-[11px] line-clamp-2">{comic.title}</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none gap-1">
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border ${typeInfo.color}`}
          >
            {typeInfo.label}
          </span>
          <div className="flex items-center gap-1">
            {hasRead && (
              <span className="bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                <Check className="w-2.5 h-2.5" />
                <span>Dibaca</span>
              </span>
            )}
            {comic.isFullColor && (
              <span className="bg-amber-500 text-zinc-950 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                <Palette className="w-2.5 h-2.5" />
                <span>Warna</span>
              </span>
            )}
          </div>
        </div>

        {/* Latest Chapter Badge at bottom of cover */}
        {comic.latestChapter && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent p-2 pt-4">
            <span className="text-[10px] font-medium text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-900">
              {comic.latestChapter}
            </span>
          </div>
        )}
      </div>

      {/* Info Container */}
      <div className="p-2 flex flex-col flex-1 justify-between gap-1">
        <div>
          <h3
            className={`text-xs font-semibold line-clamp-2 leading-snug ${
              hasRead ? 'text-blue-300' : 'text-zinc-200'
            }`}
          >
            {comic.title}
          </h3>
          {comic.altTitle && comic.altTitle !== comic.title && (
            <p className="text-[10px] text-zinc-500 line-clamp-1 italic mt-0.5">
              Alt: {comic.altTitle}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
