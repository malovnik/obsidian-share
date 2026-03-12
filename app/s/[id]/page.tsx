import { notFound } from 'next/navigation';
import Link from 'next/link';
import { extractIdFromSlug, isValidSlug } from '@/lib/utils/slug';
import { stripFrontmatter } from '@/app/lib/frontmatter';
import { stripMarkdown } from '@/lib/utils/markdown';
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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id: idOrSlug } = await params;

  const meta = await getNoteMeta(idOrSlug);

  if (!meta) {
    return {
      title: 'Заметка не найдена | Obsidian Share',
      description: 'Запрошенная заметка не найдена или была удалена',
    };
  }

  if (meta.noIndex) {
    return {
      title: 'Private Note',
      description: 'This note is private.',
      robots: {
        index: false,
        follow: false,
        nocache: true,
        noarchive: true,
        nosnippet: true,
      },
    };
  }

  const note = await getNote(idOrSlug);

  if (!note) {
    return {
      title: 'Заметка не найдена | Obsidian Share',
      description: 'Запрошенная заметка не найдена или была удалена',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://read.malovnik.ru';
  const url = `${baseUrl}/s/${idOrSlug}`;
  const cleanText = stripMarkdown(stripFrontmatter(note.content));
  const description = cleanText.substring(0, 160);
  const authorName = 'Малов Никита';
  const siteName = 'Obsidian Share - Заметки от Малова Никиты';

  return {
    title: `${note.title} | ${authorName}`,
    description,
    authors: [{ name: authorName }],
    creator: authorName,
    publisher: authorName,
    keywords: [
      note.title,
      'заметки',
      'obsidian',
      'малов никита',
      'личный блог',
      'статьи',
    ],

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
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: note.title,
        },
      ],
    },

    twitter: {
      card: 'summary_large_image',
      title: note.title,
      description,
      creator: '@malovkaif',
      images: [`${baseUrl}/og-image.png`],
    },

    other: {
      'yandex-verification': process.env.YANDEX_VERIFICATION || '',
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large' as const,
        'max-snippet': -1,
      },
    },

    alternates: {
      canonical: url,
    },
  };
}
