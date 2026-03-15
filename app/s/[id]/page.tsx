import { notFound } from 'next/navigation';
import Link from 'next/link';
import { eq, or, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { notes, noteViews } from '@/lib/db/schema';
import { extractIdFromSlug, isValidSlug, createFullSlug } from '@/lib/utils/slug';
import { stripFrontmatter } from '@/app/lib/frontmatter';
import { stripMarkdown } from '@/lib/utils/markdown';
import { getRelatedArticles } from '@/lib/queries/related';
import PrivateNotePage from '@/app/components/PrivateNotePage';
import ProgressBar from '@/app/components/ProgressBar';
import ArticleSidebar from '@/app/components/ArticleSidebar';
import ReadingPosition from '@/app/components/ReadingPosition';
import CodeCopyButtons from '@/app/components/CodeCopyButtons';
import LinkPreviews from '@/app/components/LinkPreviews';
import ArticleJsonLd from '@/app/components/ArticleJsonLd';

interface Note {
  id: string;
  title: string;
  content: string;
  htmlContent: string;
  theme: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  tags: string[] | null;
  readingTime: number;
}

async function getNote(idOrSlug: string): Promise<Note | null> {
  try {
    const extractedId = isValidSlug(idOrSlug) ? extractIdFromSlug(idOrSlug) : idOrSlug;

    let [note] = await db
      .select()
      .from(notes)
      .where(eq(notes.id, extractedId))
      .limit(1);

    if (!note) {
      [note] = await db
        .select()
        .from(notes)
        .where(eq(notes.slug, idOrSlug.replace(/-[^-]*$/, '')))
        .limit(1);
    }

    if (!note) {
      [note] = await db
        .select()
        .from(notes)
        .where(eq(notes.id, idOrSlug))
        .limit(1);
    }

    if (!note || note.isDeleted) {
      return null;
    }

    if (note.expiresAt && new Date() > note.expiresAt) {
      await db
        .update(notes)
        .set({ isDeleted: true })
        .where(eq(notes.id, note.id));
      return null;
    }

    if (note.password) {
      return null;
    }

    const viewerIp = 'ssr-prerender';

    const [existingView] = await db
      .select()
      .from(noteViews)
      .where(and(eq(noteViews.noteId, note.id), eq(noteViews.viewerIp, viewerIp)))
      .limit(1);

    const newViewCount = (note.viewCount || 0) + 1;
    let newUniqueViewCount = note.uniqueViewCount || 0;

    if (!existingView) {
      newUniqueViewCount += 1;
      await db.insert(noteViews).values({ noteId: note.id, viewerIp });
    }

    await db
      .update(notes)
      .set({ viewCount: newViewCount, uniqueViewCount: newUniqueViewCount })
      .where(eq(notes.id, note.id));

    return {
      id: note.id,
      title: note.title,
      content: note.content,
      htmlContent: note.htmlContent ?? '',
      theme: note.theme ?? 'default',
      viewCount: newViewCount,
      createdAt: note.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: note.updatedAt?.toISOString() ?? null,
      tags: note.tags,
      readingTime: note.readingTime ?? 0,
    };
  } catch (error) {
    console.error('Failed to fetch note:', error);
    return null;
  }
}

async function getNoteMeta(idOrSlug: string): Promise<{ id: string; noIndex: boolean } | null> {
  try {
    const noteId = extractIdFromSlug(idOrSlug);
    const slugWithoutId = idOrSlug.replace(/-[^-]*$/, '');

    const results = await db
      .select({
        id: notes.id,
        noIndex: notes.noIndex,
        isDeleted: notes.isDeleted,
      })
      .from(notes)
      .where(
        or(
          eq(notes.id, noteId),
          eq(notes.id, idOrSlug),
          eq(notes.slug, idOrSlug),
          eq(notes.slug, slugWithoutId)
        )
      )
      .limit(1);

    const note = results[0];

    if (!note || note.isDeleted) {
      return null;
    }

    return {
      id: note.id,
      noIndex: note.noIndex ?? false,
    };
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

  const noteTags = note.tags ?? [];

  let relatedArticles: { id: string; slug: string; title: string; tags: string[] }[] = [];
  try {
    relatedArticles = await getRelatedArticles(note.id, noteTags, 3);
  } catch {
    /* related articles are optional — DB may not have tags column yet */
  }

  const formattedDate = new Date(note.createdAt).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://read.malovnik.ru';
  const articleUrl = `${baseUrl}/s/${idOrSlug}`;
  const cleanContent = stripMarkdown(stripFrontmatter(note.content));
  const wordCount = cleanContent.split(/\s+/).filter(Boolean).length;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Главная',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: note.title,
        item: articleUrl,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <ArticleJsonLd
        title={note.title}
        description={cleanContent.substring(0, 160)}
        url={articleUrl}
        datePublished={note.createdAt}
        dateModified={note.updatedAt ?? note.createdAt}
        authorName="Малов Никита"
        tags={noteTags}
        imageUrl={`${baseUrl}/og-image.png`}
        wordCount={wordCount}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProgressBar />
      <ReadingPosition articleId={note.id} />

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
              {noteTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {noteTags.map((tag) => (
                    <span key={tag} className="bg-gray-100 text-gray-700 rounded-sm px-2 py-0.5 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </header>

            <article
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: note.htmlContent }}
            />
            <CodeCopyButtons />
            <LinkPreviews />

            {relatedArticles.length > 0 && (
              <section className="mt-16 pt-8 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-black mb-4">Похожие статьи</h2>
                <div className="space-y-3">
                  {relatedArticles.map((related) => (
                    <Link
                      key={related.id}
                      href={`/s/${related.slug}`}
                      className="block group"
                    >
                      <span className="text-base text-black group-hover:text-gray-600 transition-colors">
                        {related.title}
                      </span>
                      {related.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {related.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-xs text-gray-400">{tag}</span>
                          ))}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-12 pt-8 border-t border-gray-200">
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

  const noteTags = note.tags ?? [];
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://read.malovnik.ru';
  const url = `${baseUrl}/s/${idOrSlug}`;
  const withoutFrontmatter = stripFrontmatter(note.content)
    .replace(/^---[\s\S]*?---\s*/gm, '')
    .replace(/^(shareurl|sharemode|cssclasses|tags|aliases|created|updated|publish):\s*.+$/gm, '')
    .trim();
  const cleanText = stripMarkdown(withoutFrontmatter);
  const description = cleanText.substring(0, 160);
  const authorName = 'Малов Никита';
  const siteName = 'Малов НикИИта 🍳 Жарю ИИшку';

  return {
    title: note.title,
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
      modifiedTime: note.updatedAt ?? note.createdAt,
      authors: [authorName],
      tags: noteTags,
      section: noteTags[0] ?? 'Заметки',
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
      'article:author': authorName,
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
