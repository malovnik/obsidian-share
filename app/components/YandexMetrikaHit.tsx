'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

declare global {
  interface Window {
    ym: (id: number, method: string, ...args: unknown[]) => void;
  }
}

const METRIKA_ID = 107578899;

export default function YandexMetrikaHit() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

    if (typeof window !== 'undefined' && typeof window.ym === 'function') {
      window.ym(METRIKA_ID, 'hit', url, {
        title: document.title,
      });
    }
  }, [pathname, searchParams]);

  return null;
}
