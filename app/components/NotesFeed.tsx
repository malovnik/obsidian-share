'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ArticleCard from './ArticleCard';
import CardSkeleton from './CardSkeleton';
import SearchBar from './SearchBar';
import TagFilter from './TagFilter';
import type { TagInfo } from '@/types/contracts';

interface Note {
  id: string;
  slug: string;
  title: string;
  snippet: string;
  tags: string[];
  readingTime: number;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  isPrivate: boolean;
  coverImageId: string | null;
}

interface NotesResponse {
  notes: Note[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    limit: number;
  };
}

export default function NotesFeed() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Note[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tags, setTags] = useState<TagInfo[]>([]);
  const [activeTags, setActiveTags] = useState<string[]>(() => {
    const tagsParam = searchParams.get('tags');
    return tagsParam ? tagsParam.split(',').filter(Boolean) : [];
  });

  const loaderRef = useRef<HTMLDivElement>(null);

  const loadNotes = useCallback(async (nextCursor: string | null = null) => {
    try {
      setLoading(true);
      const url = new URL('/api/notes', window.location.origin);
      url.searchParams.set('limit', '12');
      if (nextCursor) {
        url.searchParams.set('cursor', nextCursor);
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch notes');

      const data: NotesResponse = await response.json();

      const normalizedNotes = data.notes.map((n) => ({
        ...n,
        tags: n.tags || [],
        readingTime: n.readingTime || 0,
      }));

      setNotes((prev) => [...prev, ...normalizedNotes]);
      setHasMore(data.pagination.hasMore);
      setCursor(data.pagination.nextCursor);
    } catch (error) {
      console.error('Failed to load notes:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (searchParams.get('focus') === 'search') {
      const searchInput = document.querySelector<HTMLInputElement>('input[placeholder*="Поиск"]');
      if (searchInput) {
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => searchInput.focus(), 400);
      }
      router.replace('/', { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await fetch('/api/tags');
        if (response.ok) {
          const data = await response.json();
          setTags(Array.isArray(data) ? data : data.tags || []);
        }
      } catch {
        /* tags endpoint may not exist yet */
      }
    };
    fetchTags();
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const url = new URL('/api/search', window.location.origin);
        url.searchParams.set('q', searchQuery);
        if (activeTags.length > 0) {
          url.searchParams.set('tags', activeTags.join(','));
        }
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const results = (data.notes || []).map((n: Note) => ({
            ...n,
            tags: n.tags || [],
            readingTime: n.readingTime || 0,
          }));
          setSearchResults(results);
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, activeTags]);

  const handleTagToggle = (tag: string) => {
    setActiveTags((prev) => {
      const next = prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag];
      const params = new URLSearchParams(searchParams.toString());
      if (next.length > 0) {
        params.set('tags', next.join(','));
      } else {
        params.delete('tags');
      }
      router.replace(`?${params.toString()}`, { scroll: false });
      return next;
    });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading && !searchQuery) {
          loadNotes(cursor);
        }
      },
      { threshold: 0.1 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) observer.unobserve(currentLoader);
    };
  }, [hasMore, loading, cursor, loadNotes, searchQuery]);

  const displayNotes = searchResults !== null ? searchResults : notes;
  const isLoading = searchResults !== null ? searching : loading;

  return (
    <div className="max-w-6xl mx-auto px-4 pt-16 pb-20">
      {/* Hero */}
      <header className="text-center mb-12">
        <h1 className="text-5xl font-light text-black tracking-tight mb-3">
          Заметки
        </h1>
        <p className="text-gray-500 text-base mb-4">
          Об AI, разработке, продуктивности и не только
        </p>
        <a
          href="https://t.me/malovkaif"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-black transition-colors mb-8"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
          <span>Телеграм-канал</span>
        </a>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          className="max-w-md mx-auto"
        />
      </header>

      {/* Tag filter */}
      {tags.length > 0 && (
        <div className="mb-8">
          <TagFilter tags={tags} activeTags={activeTags} onToggle={handleTagToggle} />
        </div>
      )}

      {/* Cards grid */}
      {isLoading && displayNotes.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : displayNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayNotes.map((note) => (
            <ArticleCard
              key={note.id}
              id={note.id}
              slug={note.slug}
              title={note.title}
              snippet={note.snippet}
              tags={note.tags}
              readingTime={note.readingTime}
              createdAt={note.createdAt}
              viewCount={note.viewCount}
              coverImageId={note.coverImageId ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400 text-lg">
          Ничего не найдено
        </div>
      )}

      {/* Infinite scroll loader */}
      <div ref={loaderRef} className="mt-10 text-center py-8">
        {isLoading && displayNotes.length > 0 && (
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Загрузка...</span>
          </div>
        )}
        {!isLoading && !hasMore && notes.length > 0 && !searchQuery && (
          <p className="text-gray-400 text-sm">Все заметки загружены</p>
        )}
      </div>
    </div>
  );
}
