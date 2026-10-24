'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

interface ReaderImageProps {
  src: string;
  fallbackSrc?: string;
  pageIndex: number;
}

export function ReaderImage({ src, fallbackSrc, pageIndex }: ReaderImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setCurrentSrc(src);
    setLoaded(false);
    setError(false);
    setHasTriedFallback(false);
  }, [src]);

  const handleImageError = () => {
    if (fallbackSrc && !hasTriedFallback && currentSrc !== fallbackSrc) {
      setHasTriedFallback(true);
      setCurrentSrc(fallbackSrc);
    } else {
      setError(true);
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(false);
    setLoaded(false);
    if (fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasTriedFallback(true);
    }
    setRetryKey(k => k + 1);
  };

  // Prioritize the first 3 images so the chapter opens immediately
  const isPriority = pageIndex < 3;

  return (
    <div className="reader-panel relative w-full min-h-[300px] flex items-center justify-center bg-zinc-950">
      {/* Loading Skeleton */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-zinc-900/60 animate-pulse flex items-center justify-center">
          <span className="text-xs text-zinc-600 font-mono">Halaman {pageIndex + 1}</span>
        </div>
      )}

      {/* Error Retry Overlay */}
      {error && (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-900/80 rounded-xl my-4 gap-2 text-center border border-zinc-800">
          <AlertCircle className="w-6 h-6 text-rose-400" />
          <span className="text-xs text-zinc-300">Gagal memuat halaman {pageIndex + 1}</span>
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 mt-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Coba Muat Ulang</span>
          </button>
        </div>
      )}

      {/* Image Element */}
      {!error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${currentSrc}-${retryKey}`}
          src={currentSrc}
          alt={`Halaman ${pageIndex + 1}`}
          loading={isPriority ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={handleImageError}
          className={`w-full h-auto block select-none transition-opacity duration-150 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}
