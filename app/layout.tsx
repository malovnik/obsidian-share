import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from './components/Header';
import Footer from './components/Footer';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Obsidian Share',
  description: 'Публичные заметки из Obsidian',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className={inter.variable}>
      <body className="antialiased font-sans bg-white text-gray-900">
        <Header />
        <div className="min-h-screen">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
