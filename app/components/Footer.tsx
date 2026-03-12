export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="text-sm text-gray-500">Малов Никита</span>
        <a
          href="https://t.me/malovkaif"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-400 hover:text-black transition-colors"
        >
          Telegram
        </a>
      </div>
    </footer>
  );
}
