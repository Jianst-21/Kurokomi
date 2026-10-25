export type ComicType = 'manga' | 'manhwa' | 'manhua' | 'all';

export interface ComicCardItem {
  id: string;
  title: string;
  altTitle?: string;
  coverUrl: string;
  type: 'manga' | 'manhwa' | 'manhua' | 'other';
  latestChapter?: string;
  updatedAt?: string;
  isFullColor?: boolean;
}

export interface ComicDetail {
  id: string;
  title: string;
  altTitles: string[];
  description: string;
  coverUrl: string;
  type: 'manga' | 'manhwa' | 'manhua' | 'other';
  status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
  genres: string[];
  isFullColor: boolean;
  author?: string;
  artist?: string;
  year?: number;
}

export interface ChapterItem {
  id: string;
  chapter: string;
  title?: string;
  scanlationGroup?: string;
  publishAt: string;
  pagesCount: number;
}

export interface ChapterPageItem {
  url: string;
  fallbackUrl: string;
}

export interface FilterOptions {
  type?: ComicType;
  isColor?: boolean;
  genre?: string;
  limit?: number;
  offset?: number;
}

export interface ReadingHistoryItem {
  mangaId: string;
  title: string;
  coverUrl: string;
  type: 'manga' | 'manhwa' | 'manhua' | 'other';
  chapterId: string;
  chapterNumber: string;
  readAt: string;
}
