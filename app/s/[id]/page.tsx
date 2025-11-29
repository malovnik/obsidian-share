import { notFound } from 'next/navigation';
import Link from 'next/link';
import { extractIdFromSlug, isValidSlug } from '@/lib/utils/slug';

interface Note {
  id: string;
  title: string;
  content: string;
  htmlContent: string;
  theme: string;
  viewCount: number;
  createdAt: string;
}

async function getNote(idOrSlug: string): Promise<Note | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    // API route will handle both slug and ID formats
    const res = await fetch(`${baseUrl}/api/share/${idOrSlug}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Failed to fetch note:', error);
    return null;
  }
}

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idOrSlug } = await params;
  const note = await getNote(idOrSlug);

  if (!note) {
    notFound();
  }

  // Get customCss from note
  const customCss = (note as any).customCss || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Custom CSS from Obsidian theme */}
      {customCss && (
        <style dangerouslySetInnerHTML={{ __html: customCss }} />
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

        {/* Author Block - Top */}
        <div className="mb-8 bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
              МН
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Автор: Малов Никита</h2>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-1 text-sm">
                <a
                  href="https://t.me/malovkaif"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                >
                  📢 Telegram канал: @malovkaif
                </a>
                <a
                  href="https://t.me/mnvgpt_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-700 transition-colors flex items-center gap-1"
                >
                  🤖 Бесплатный GPT без ВПН
                </a>
              </div>
            </div>
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

        {/* "Читать другие статьи" button - Before Author Block */}
        <div className="mt-12 mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            <span>📚</span>
            <span>Читать другие статьи</span>
          </Link>
        </div>

        {/* Author Block - Bottom */}
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

// Metadata для SEO
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id: idOrSlug } = await params;
  const note = await getNote(idOrSlug);

  if (!note) {
    return {
      title: 'Заметка не найдена | Obsidian Share',
      description: 'Запрошенная заметка не найдена или была удалена',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://read.malovnik.ru';
  const url = `${baseUrl}/s/${idOrSlug}`;
  const description = note.content.substring(0, 160).replace(/[#*_`\[\]]/g, '');
  const authorName = 'Малов Никита';
  const siteName = 'Obsidian Share - Заметки от Малова Никиты';

  // Если приватная ссылка - запрещаем индексацию
  const noIndex = (note as any).noIndex || false;

  return {
    title: `${note.title} | ${authorName}`,
    description,
    authors: [{ name: authorName }],
    creator: authorName,
    publisher: authorName,
    keywords: noIndex ? [] : [
      note.title,
      'заметки',
      'obsidian',
      'малов никита',
      'личный блог',
      'статьи',
    ],

    // Open Graph
    openGraph: {
      type: 'article',
      url,
      title: note.title,
      description,
      siteName,
      locale: 'ru_RU',
      publishedTime: note.createdAt,
      authors: [authorName],
      images: [
        {
          url: `${baseUrl}/og-image.png`, // TODO: Add dynamic OG image generation
          width: 1200,
          height: 630,
          alt: note.title,
        },
      ],
    },

    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: note.title,
      description,
      creator: '@malovkaif',
      images: [`${baseUrl}/og-image.png`],
    },

    // Yandex specific
    other: {
      'yandex-verification': process.env.YANDEX_VERIFICATION || '',
    },

    // Robots
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    // Canonical URL
    alternates: {
      canonical: url,
    },
  };
}
