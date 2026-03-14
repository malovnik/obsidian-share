'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createFullSlug } from '@/lib/utils/slug';

interface AdminNote {
  id: string;
  title: string;
  slug: string;
  viewCount: number;
  uniqueViewCount: number;
  isDeleted: boolean;
  createdAt: string;
  sourceId: string | null;
  noIndex: boolean;
  readingTime: number;
  coverImageId: string | null;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [search, setSearch] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  const fetchNotes = useCallback(async (query = '') => {
    try {
      const params = query ? `?search=${encodeURIComponent(query)}` : '';
      const res = await fetch(`/api/admin/notes${params}`);
      if (res.status === 401) {
        setAuthed(false);
        setLoading(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes);
        setAuthed(true);
      }
    } catch {
      /* network error */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useEffect(() => {
    if (!authed) return;
    const timer = setTimeout(() => fetchNotes(search), 300);
    return () => clearTimeout(timer);
  }, [search, authed, fetchNotes]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        setAuthed(true);
        setPassword('');
        fetchNotes();
      } else {
        const data = await res.json();
        setLoginError(data.error || 'Ошибка входа');
      }
    } catch {
      setLoginError('Ошибка сети');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Удалить «${title}»?`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes((prev) => prev.filter((n) => n.id !== id));
      }
    } catch {
      /* error */
    } finally {
      setDeletingId(null);
    }
  };

  const handleRemoveCover = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove-cover' }),
      });

      if (res.ok) {
        setNotes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, coverImageId: null } : n))
        );
      }
    } catch {
      /* error */
    }
  };

  const handleReplaceCover = (noteId: string) => {
    setActiveNoteId(noteId);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeNoteId) return;

    const noteId = activeNoteId;
    setUploadingId(noteId);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const res = await fetch(`/api/admin/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set-cover',
          imageData: base64,
          filename: file.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotes((prev) =>
          prev.map((n) =>
            n.id === noteId ? { ...n, coverImageId: data.coverImageId } : n
          )
        );
      }
    } catch {
      /* error */
    } finally {
      setUploadingId(null);
      setActiveNoteId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setAuthed(false);
    setNotes([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-xs">
          <div className="border-2 border-black p-6">
            <h1 className="text-lg font-semibold text-black mb-6 tracking-tight">
              Вход
            </h1>

            <input
              type="text"
              placeholder="Логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm mb-3 focus:outline-none focus:border-black transition-colors"
              autoComplete="username"
            />

            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 px-3 py-2 text-sm mb-4 focus:outline-none focus:border-black transition-colors"
              autoComplete="current-password"
            />

            {loginError && (
              <p className="text-red-600 text-xs mb-3">{loginError}</p>
            )}

            <button
              type="submit"
              className="w-full bg-black text-white py-2 text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Войти
            </button>
          </div>
        </form>
      </div>
    );
  }

  const activeNotes = notes.filter((n) => !n.isDeleted);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="hidden"
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-black tracking-tight">
            Статьи
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {activeNotes.length} активных
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-black transition-colors"
        >
          Выйти
        </button>
      </div>

      <input
        type="text"
        placeholder="Поиск по названию..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-200 px-3 py-2 text-sm mb-4 focus:outline-none focus:border-black transition-colors"
      />

      <div className="border-t border-gray-200">
        {activeNotes.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            {search ? 'Ничего не найдено' : 'Нет статей'}
          </p>
        ) : (
          activeNotes.map((note) => {
            const fullSlug = createFullSlug(note.title, note.id);
            const date = new Date(note.createdAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
            });

            return (
              <div
                key={note.id}
                className="flex items-center gap-3 py-2.5 border-b border-gray-100 group"
              >
                {/* Cover thumbnail */}
                <div className="shrink-0 w-12 h-8 bg-gray-100 border border-gray-200 overflow-hidden relative group/cover">
                  {note.coverImageId ? (
                    <img
                      src={`/api/images/${note.coverImageId}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-[10px] text-gray-300 font-bold">
                        {note.title.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                <a
                  href={`/s/${fullSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0 text-sm text-gray-800 hover:text-black truncate transition-colors"
                  title={note.title}
                >
                  {note.noIndex && (
                    <span className="inline-block w-3 h-3 mr-1.5 align-middle opacity-40">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </span>
                  )}
                  {note.title}
                </a>

                <span className="text-xs text-gray-300 shrink-0 tabular-nums" title="Уникальные / Все просмотры">
                  {note.uniqueViewCount || 0}/{note.viewCount || 0}
                </span>

                <span className="text-xs text-gray-300 shrink-0 w-16 text-right">
                  {date}
                </span>

                {/* Cover actions */}
                <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                  {note.coverImageId ? (
                    <button
                      onClick={() => handleRemoveCover(note.id)}
                      className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-orange-500 transition-colors"
                      title="Удалить обложку"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="9" x2="15" y2="15" />
                        <line x1="15" y1="9" x2="9" y2="15" />
                      </svg>
                    </button>
                  ) : null}
                  <button
                    onClick={() => handleReplaceCover(note.id)}
                    disabled={uploadingId === note.id}
                    className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-blue-500 transition-colors disabled:opacity-50"
                    title={note.coverImageId ? 'Заменить обложку' : 'Загрузить обложку'}
                  >
                    {uploadingId === note.id ? (
                      <div className="w-3 h-3 border border-gray-400 border-t-transparent animate-spin rounded-full" />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    )}
                  </button>
                </div>

                <button
                  onClick={() => handleDelete(note.id, note.title)}
                  disabled={deletingId === note.id}
                  className="shrink-0 w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                  title="Удалить"
                >
                  {deletingId === note.id ? (
                    <div className="w-3 h-3 border border-gray-400 border-t-transparent animate-spin rounded-full" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
