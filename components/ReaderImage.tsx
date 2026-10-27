'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

interface ReaderImageProps {
  src: string;
  fallbackSrc?: string;
  pageIndex: number;
  fitContain?: boolean;
}

export function ReaderImage({ src, fallbackSrc, pageIndex, fitContain = false }: ReaderImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [error, setError] = useState(false);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);
  const [hasTriedProxy, setHasTriedProxy] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    setCurrentSrc(src);
    setError(false);
    setHasTriedFallback(false);
    setHasTriedProxy(false);
  }, [src]);

  const handleImageError = () => {
    if (fallbackSrc && !hasTriedFallback && currentSrc !== fallbackSrc) {
      setHasTriedFallback(true);
      setCurrentSrc(fallbackSrc);
    } else if (!hasTriedProxy && !currentSrc.startsWith('/api/image-proxy')) {
      // Automatic fallback via Kurokomi server image proxy to bypass ISP blocking & hotlink issues
      setHasTriedProxy(true);
      setCurrentSrc(`/api/image-proxy?url=${encodeURIComponent(src)}`);
    } else {
      setError(true);
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(false);
    setHasTriedFallback(false);
    setHasTriedProxy(false);
    setCurrentSrc(src);
    setRetryKey(k => k + 1);
  };

  if (error) {
    return (
      <div className="w-full py-8 px-4 flex flex-col items-center justify-center bg-zinc-900/80 my-1 gap-2 text-center border border-zinc-800">
        <AlertCircle className="w-5 h-5 text-rose-400" />
        <span className="text-xs text-zinc-300">Gagal memuat halaman {pageIndex + 1}</span>
        <button
          onClick={handleRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 mt-1 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs text-zinc-200 transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Coba Muat Ulang</span>
        </button>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={`${currentSrc}-${retryKey}`}
      src={currentSrc}
      alt={`Halaman ${pageIndex + 1}`}
      loading={pageIndex < 4 ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={handleImageError}
      className={
        fitContain
          ? "max-h-[100dvh] max-w-full w-auto h-auto block m-auto border-0 outline-none select-none bg-black object-contain pointer-events-none [-webkit-touch-callout:none]"
          : "w-full h-auto block m-0 p-0 border-0 outline-none select-none bg-black [content-visibility:auto] [contain-intrinsic-size:800px] pointer-events-none [-webkit-touch-callout:none]"
      }
    />
  );
}
