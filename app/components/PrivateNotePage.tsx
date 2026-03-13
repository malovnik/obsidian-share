'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PinCodeModal from './PinCodeModal';
import ProgressBar from './ProgressBar';
import ArticleSidebar from './ArticleSidebar';

interface Note {
  id: string;
  title: string;
  htmlContent: string;
  customCss?: string;
  viewCount: number;
  createdAt: string;
}

export default function PrivateNotePage({ noteId }: { noteId: string }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const verified = sessionStorage.getItem('pincode_verified');
    setIsUnlocked(verified === 'true');
    setIsChecking(false);

    if (verified === 'true') {
      loadNote();
    }
  }, []);

  const loadNote = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/share/${noteId}`);
      if (response.ok) {
        const data = await response.json();
        setNote(data);
      }
    } catch (error) {
      console.error('Failed to load note:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setIsUnlocked(true);
    loadNote();
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return <PinCodeModal onSuccess={handleSuccess} />;
  }

  if (loading || !note) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Загрузка статьи...</p>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(note.createdAt).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-white">
      <ProgressBar />

      <div className="max-w-6xl mx-auto px-4 pt-8 pb-20">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-black text-sm transition-colors"
          >
            <span>←</span>
            <span>Все статьи</span>
          </Link>
        </div>

        <div className="mb-6 border-l-2 border-black pl-4 py-1">
          <span className="text-sm text-gray-500">Приватная заметка</span>
        </div>

        <div className="flex gap-12">
          <main className="max-w-[680px] mx-auto w-full">
            <header className="mb-10">
              <h1 className="text-4xl font-semibold text-black tracking-tight mb-4 break-words">
                {note.title}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span>{formattedDate}</span>
                <span>·</span>
                <span>{note.viewCount} просмотров</span>
              </div>
            </header>

            <article
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: note.htmlContent }}
            />

            <div className="mt-16 pt-8 border-t border-gray-200">
              <Link
                href="/"
                className="text-sm text-gray-400 hover:text-black transition-colors"
              >
                ← Все статьи
              </Link>
            </div>
          </main>

          <ArticleSidebar />
        </div>
      </div>
    </div>
  );
}
