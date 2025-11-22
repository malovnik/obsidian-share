import { notFound } from 'next/navigation';

interface Note {
  id: string;
  title: string;
  content: string;
  htmlContent: string;
  theme: string;
  viewCount: number;
  createdAt: string;
}

async function getNote(id: string): Promise<Note | null> {
  const apiUrl = process.env.API_URL || 'http://localhost:4000';

  try {
    const res = await fetch(`${apiUrl}/api/share/${id}`, {
      cache: 'no-store', // Всегда актуальные данные
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

export default async function NotePage({ params }: { params: { id: string } }) {
  const note = await getNote(params.id);

  if (!note) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
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
          className="bg-white rounded-2xl shadow-xl p-8 md:p-12 markdown-body"
          dangerouslySetInnerHTML={{ __html: note.htmlContent }}
        />

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Создано с помощью Obsidian Share</p>
        </footer>
      </div>
    </div>
  );
}

// Metadata для SEO
export async function generateMetadata({ params }: { params: { id: string } }) {
  const note = await getNote(params.id);

  if (!note) {
    return {
      title: 'Заметка не найдена',
    };
  }

  return {
    title: note.title,
    description: note.content.substring(0, 160),
  };
}
