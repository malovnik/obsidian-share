import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 — Страница не найдена',
  description: 'Запрошенная страница не найдена или была удалена',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-semibold text-black tracking-tight mb-4">404</h1>
        <p className="text-gray-500 text-lg mb-8">
          Страница не найдена или была удалена
        </p>
        <Link
          href="/"
          className="inline-block bg-black text-white px-6 py-3 text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
}
