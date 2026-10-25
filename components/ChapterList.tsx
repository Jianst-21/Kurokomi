'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpDown, BookOpen, Clock, ChevronRight, Check } from 'lucide-react';
import { ChapterItem } from '@/lib/types';
import { sortChapters } from '@/lib/mangadex';
import { formatChapterDate } from '@/lib/date';
import { getReadChapterIds } from '@/lib/storage';

interface ChapterListProps {
  mangaId: string;
  chapters: ChapterItem[];
  lastReadChapterId?: string;
}

export function ChapterList({ mangaId, chapters, lastReadChapterId }: ChapterListProps) {
  const [ascending, setAscending] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReadIds(new Set(getReadChapterIds()));
  }, []);

  const sorted = sortChapters(chapters, ascending);

  return (
    <div className="flex flex-col gap-3">
      {/* List Header & Sort Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <span>Daftar Chapter ({chapters.length})</span>
        </div>
        <button
          onClick={() => setAscending(!ascending)}
          aria-label="Ubah urutan"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowUpDown className="w-3 h-3" />
          <span>{ascending ? 'Terlama' : 'Terbaru'}</span>
        </button>
      </div>

      {/* Chapters Stack */}
      <div className="flex flex-col gap-1.5">
        {sorted.map(ch => {
          const isLastRead = ch.id === lastReadChapterId;
          const isRead = isLastRead || readIds.has(ch.id);
          const formattedDate = formatChapterDate(ch.publishAt);
          const hasCustomTitle = Boolean(
            ch.title &&
            ch.title.trim().toLowerCase() !== `chapter ${ch.chapter}`.toLowerCase() &&
            ch.title.trim().toLowerCase() !== `ch. ${ch.chapter}`.toLowerCase() &&
            ch.title.trim().toLowerCase() !== `ch ${ch.chapter}`.toLowerCase() &&
            ch.title.trim() !== ch.chapter.trim()
          );

          return (
            <Link
              key={ch.id}
              href={`/chapter/${ch.id}?mangaId=${mangaId}`}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                isLastRead
                  ? 'bg-blue-950/40 border-blue-800/80 text-blue-200'
                  : isRead
                  ? 'bg-blue-950/20 border-blue-900/50 hover:bg-blue-900/30 text-blue-300'
                  : 'bg-zinc-900/60 border-zinc-850 hover:bg-zinc-850/80 text-zinc-200'
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold ${
                      isRead ? 'text-blue-400' : 'text-zinc-200'
                    }`}
                  >
                    Chapter {ch.chapter}
                  </span>
                  {isLastRead ? (
                    <span className="text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">
                      Terakhir Dibaca
                    </span>
                  ) : isRead ? (
                    <span className="text-[9px] font-semibold bg-blue-950 text-blue-400 border border-blue-900/80 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" />
                      <span>Sudah Dibaca</span>
                    </span>
                  ) : null}
                </div>
                {hasCustomTitle && (
                  <span className="text-[11px] text-zinc-400 line-clamp-1">
                    {ch.title}
                  </span>
                )}
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                  {formattedDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formattedDate}
                    </span>
                  )}
                  {ch.scanlationGroup && (
                    <span>{formattedDate ? '• ' : ''}{ch.scanlationGroup}</span>
                  )}
                </div>
              </div>

              <ChevronRight
                className={`w-4 h-4 shrink-0 ${
                  isRead ? 'text-blue-400' : 'text-zinc-500'
                }`}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
