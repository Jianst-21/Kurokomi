'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Palette, BookOpen } from 'lucide-react';
import { ComicCardItem } from '@/lib/types';

interface ComicCardProps {
  comic: ComicCardItem;
}

export function ComicCard({ comic }: ComicCardProps) {
  const [imageError, setImageError] = useState(false);

  const typeLabels: Record<string, { label: string; color: string }> = {
    manhwa: { label: 'Manhwa', color: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60' },
    manga: { label: 'Manga', color: 'bg-blue-950/80 text-blue-400 border-blue-800/60' },
    manhua: { label: 'Manhua', color: 'bg-amber-950/80 text-amber-400 border-amber-800/60' },
    other: { label: 'Komik', color: 'bg-zinc-800 text-zinc-300 border-zinc-700' },
  };

  const typeInfo = typeLabels[comic.type] || typeLabels.other;

  return (
    <Link
      href={`/manga/${comic.id}`}
      className="group flex flex-col bg-zinc-900/60 rounded-xl overflow-hidden border border-zinc-800/60 hover:border-zinc-700 transition-all"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] w-full bg-zinc-800 overflow-hidden">
        {comic.coverUrl && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={comic.coverUrl}
            alt={comic.title}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-850 text-zinc-600 gap-2 p-3 text-center">
            <BookOpen className="w-8 h-8 opacity-40" />
            <span className="text-[11px] line-clamp-2">{comic.title}</span>
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md border backdrop-blur-md ${typeInfo.color}`}
          >
            {typeInfo.label}
          </span>
          {comic.isFullColor && (
            <span className="bg-amber-500/90 text-zinc-950 text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
              <Palette className="w-2.5 h-2.5" />
              <span>Warna</span>
            </span>
          )}
        </div>

        {/* Latest Chapter Badge at bottom of cover */}
        {comic.latestChapter && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/60 to-transparent p-2 pt-4">
            <span className="text-[10px] font-medium text-blue-400 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-900/60">
              {comic.latestChapter}
            </span>
          </div>
        )}
      </div>

      {/* Info Container */}
      <div className="p-2 flex flex-col flex-1 justify-between">
        <h3 className="text-xs font-semibold text-zinc-200 line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
          {comic.title}
        </h3>
      </div>
    </Link>
  );
}
