'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PinCodeModal from './PinCodeModal';

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
    // Проверяем sessionStorage при монтировании
    const verified = sessionStorage.getItem('pincode_verified');
    setIsUnlocked(verified === 'true');
    setIsChecking(false);

    // Если разблокировано, загружаем заметку
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

  // Показываем лоадер пока проверяем
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  // Если не разблокировано - показываем модал
  if (!isUnlocked) {
    return <PinCodeModal onSuccess={handleSuccess} />;
  }

  // Загрузка заметки
  if (loading || !note) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка статьи...</p>
        </div>
      </div>
    );
  }

  // Показываем контент
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Custom CSS from Obsidian theme */}
      {note.customCss && (
        <style dangerouslySetInnerHTML={{ __html: note.customCss }} />
      )}

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* "Все статьи" button - Top */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors group"
          >
            <span className="transform group-hover:-translate-x-1 transition-transform">←</span>
            <span>Смотреть все статьи</span>
          </Link>
        </div>

        {/* Private badge */}
        <div className="mb-8 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-orange-800">
            <span>🔒</span>
            <span className="font-semibold">Приватная статья</span>
          </div>
        </div>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 break-words">
            {note.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>👁️ {note.viewCount} просмотров</span>
            <span>•</span>
            <span>{new Date(note.createdAt).toLocaleDateString('ru-RU')}</span>
          </div>
        </header>

        {/* Content */}
        <article
          className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 lg:p-12 markdown-body overflow-hidden"
          dangerouslySetInnerHTML={{ __html: note.htmlContent }}
        />

        {/* "Читать другие статьи" button */}
        <div className="mt-12 mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <span>📚</span>
            <span>Читать другие статьи</span>
          </Link>
        </div>

        {/* Author Block */}
        <div className="mt-8 bg-white rounded-xl shadow-md p-8 border-t-4 border-blue-500">
          <div className="text-center">
            <div className="inline-flex w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg">
              МН
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Малов Никита
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              Делюсь знаниями и опытом в области AI, разработки и продуктивности.
              Подписывайтесь на мой Telegram канал и пользуйтесь бесплатным GPT без ВПН!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a
                href="https://t.me/malovkaif"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                📢 Присоединиться к каналу
              </a>
              <a
                href="https://t.me/mnvgpt_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-md hover:shadow-lg"
              >
                🤖 Попробовать GPT бот
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
