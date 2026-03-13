'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createFullSlug } from '@/lib/utils/slug';

interface SearchResult {
  id: string;
  title: string;
  slug: string;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isArticlePage = pathname.startsWith('/s/');

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery('');
    setResults([]);
  }, []);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=6`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.notes || []);
        }
      } catch {
        /* network error */
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch();
    };
    if (searchOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [searchOpen, closeSearch]);

  const handleSearchClick = () => {
    if (isArticlePage) {
      router.push('/?focus=search');
    } else {
      setSearchOpen(!searchOpen);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    closeSearch();
    router.push(`/s/${result.slug}`);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="text-base font-semibold text-black tracking-tight hover:text-gray-600 transition-colors">
            Малов Никита
          </Link>
          {!isArticlePage && (
            <button
              onClick={handleSearchClick}
              className={`w-9 h-9 flex items-center justify-center transition-colors ${
                searchOpen ? 'text-black' : 'text-gray-400 hover:text-black'
              }`}
              aria-label="Поиск"
            >
              {searchOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
            </button>
          )}
        </div>

        <div
          className={`overflow-hidden transition-all duration-200 ease-out ${
            searchOpen ? 'max-h-80' : 'max-h-0'
          }`}
        >
          <div className="max-w-6xl mx-auto px-4 pb-4">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по статьям..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-black transition-colors"
              />
            </div>

            {query.trim() && (
              <div className="mt-2 border border-gray-100">
                {loading ? (
                  <div className="px-4 py-3 text-xs text-gray-400">Поиск...</div>
                ) : results.length > 0 ? (
                  results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleResultClick(r)}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 truncate"
                    >
                      {r.title}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-gray-400">Ничего не найдено</div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {searchOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={closeSearch}
        />
      )}
    </>
  );
}
