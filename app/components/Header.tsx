import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-base font-semibold text-black tracking-tight hover:text-gray-600 transition-colors">
          Малов Никита
        </Link>
        <Link
          href="/"
          className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-black transition-colors"
          aria-label="Поиск"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
