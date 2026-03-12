import { notFound } from 'next/navigation';
import Link from 'next/link';
import { extractIdFromSlug, isValidSlug } from '@/lib/utils/slug';
import PrivateNotePage from '@/app/components/PrivateNotePage';
import ProgressBar from '@/app/components/ProgressBar';
import ArticleSidebar from '@/app/components/ArticleSidebar';

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

async function getNoteMeta(idOrSlug: string): Promise<{ noIndex: boolean } | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/share/${idOrSlug}/meta`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch (error) {
    console.error('Failed to fetch note meta:', error);
    return null;
  }
}

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idOrSlug } = await params;

  // Сначала проверяем ТОЛЬКО приватность статьи (без загрузки контента)
  const meta = await getNoteMeta(idOrSlug);

  if (!meta) {
    notFound();
  }

  // Для приватных статей СРАЗУ возвращаем клиентский компонент
  // БЕЗ загрузки контента на сервере
  if (meta.noIndex) {
    return <PrivateNotePage noteId={idOrSlug} />;
  }

  // Для публичных статей загружаем полный контент
  const note = await getNote(idOrSlug);

  if (!note) {
    notFound();
  }

  const customCss = (note as any).customCss || '';

  const formattedDate = new Date(note.createdAt).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-white">
      <ProgressBar />

      {customCss && (
        <style dangerouslySetInnerHTML={{ __html: customCss }} />
      )}

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

    // Yandex specific + AI crawlers blocking
    other: {
      'yandex-verification': process.env.YANDEX_VERIFICATION || '',
      // Блокировка AI crawlers для приватных статей
      ...(noIndex && {
        // Perplexity AI
        'PerplexityBot': 'noindex, nofollow',
        // Anthropic Claude
        'Claude-Web': 'noindex, nofollow',
        // OpenAI GPT
        'GPTBot': 'noindex, nofollow',
        'ChatGPT-User': 'noindex, nofollow',
        // Google Bard/Gemini
        'Google-Extended': 'noindex, nofollow',
        // Exa AI
        'Exa': 'noindex, nofollow',
        // Tavily AI
        'TavilyBot': 'noindex, nofollow',
        // Common AI crawlers
        'CCBot': 'noindex, nofollow', // Common Crawl
        'anthropic-ai': 'noindex, nofollow',
        'ClaudeBot': 'noindex, nofollow',
        'cohere-ai': 'noindex, nofollow',
      }),
    },

    // Robots - блокируем поисковики и AI для приватных статей
    robots: {
      index: !noIndex,
      follow: !noIndex,
      nocache: noIndex, // Запрет кэширования для приватных
      noarchive: noIndex, // Запрет архивирования
      nosnippet: noIndex, // Запрет показа сниппетов
      noimageindex: noIndex, // Запрет индексации изображений
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        'max-image-preview': noIndex ? 'none' : 'large',
        'max-snippet': noIndex ? 0 : -1,
      },
    },

    // Canonical URL
    alternates: {
      canonical: url,
    },
  };
}
