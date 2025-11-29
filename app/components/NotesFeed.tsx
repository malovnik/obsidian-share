'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface Note {
  id: string;
  slug: string;
  title: string;
  snippet: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  isPrivate: boolean;
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
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Функция загрузки заметок
  const loadNotes = useCallback(async (nextCursor: string | null = null) => {
    try {
      setLoading(true);
      const url = new URL('/api/notes', window.location.origin);
      url.searchParams.set('limit', '10');
      if (nextCursor) {
        url.searchParams.set('cursor', nextCursor);
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch notes');

      const data: NotesResponse = await response.json();

      setNotes((prev) => [...prev, ...data.notes]);
      setHasMore(data.pagination.hasMore);
      setCursor(data.pagination.nextCursor);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Загрузка первой страницы при монтировании
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Intersection Observer для infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !loading) {
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
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [hasMore, loading, cursor, loadNotes]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <header className="mb-12 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-4">
          📝 Заметки Малова Никиты
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
          Делюсь знаниями об AI, разработке, продуктивности и не только
        </p>
      </header>

      {/* Notes Grid */}
      <div className="space-y-6">
        {notes.map((note) => {
          const fullSlug = `${note.slug}-${note.id}`;
          const formattedDate = new Date(note.createdAt).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          return (
            <Link
              key={note.id}
              href={`/s/${fullSlug}`}
              className="block bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 sm:p-8 border-l-4 border-blue-500 hover:border-indigo-600 group"
            >
              {/* Title */}
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors break-words">
                {note.title}
              </h2>

              {/* Snippet */}
              <p className="text-gray-700 mb-4 line-clamp-3 leading-relaxed">
                {note.snippet}
              </p>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  📅 {formattedDate}
                </span>
                <span className="flex items-center gap-1">
                  👁️ {note.viewCount} просмотров
                </span>
                {note.isPrivate && (
                  <span className="flex items-center gap-1 text-orange-600 font-medium">
                    🔒 Приватная
                  </span>
                )}
              </div>

              {/* Read More */}
              <div className="mt-4 flex items-center gap-2 text-blue-600 font-semibold group-hover:gap-3 transition-all">
                <span>Читать далее</span>
                <span className="transform group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Loading / End indicator */}
      <div ref={loaderRef} className="mt-8 text-center py-8">
        {loading && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-600">Загрузка заметок...</p>
          </div>
        )}
        {!loading && !hasMore && notes.length > 0 && (
          <div className="text-gray-500 text-lg">
            🎉 Вы просмотрели все заметки!
          </div>
        )}
        {!loading && notes.length === 0 && (
          <div className="text-gray-500 text-lg">
            📭 Пока нет опубликованных заметок
          </div>
        )}
      </div>

      {/* Author CTA */}
      <div className="mt-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-8 sm:p-12 text-white">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Хотите больше?
          </h2>
          <p className="text-lg sm:text-xl mb-8 opacity-90">
            Подписывайтесь на мой Telegram канал и пользуйтесь бесплатным GPT без ВПН!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://t.me/malovkaif"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 font-bold px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl"
            >
              📢 Telegram канал
            </a>
            <a
              href="https://t.me/mnvgpt_bot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-green-500 text-white font-bold px-8 py-4 rounded-lg hover:bg-green-600 transition-colors shadow-lg hover:shadow-xl"
            >
              🤖 Бесплатный GPT
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
