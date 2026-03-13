import type { Metadata } from 'next';
import Script from 'next/script';
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
  title: {
    default: 'Малов Никита — Заметки',
    template: '%s',
  },
  description: 'Заметки об AI, разработке, продуктивности и не только',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://read.malovnik.ru'),
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Малов Никита — Заметки',
  },
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
        <Script
          id="yandex-metrika"
          strategy="afterInteractive"
          src="https://mc.yandex.ru/metrika/tag.js?id=107578899"
        />
        <Script
          id="yandex-metrika-init"
          strategy="afterInteractive"
        >
          {`window.ym=window.ym||function(){(window.ym.a=window.ym.a||[]).push(arguments)};window.ym.l=1*new Date();ym(107578899,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:'dataLayer',accurateTrackBounce:true,trackLinks:true});`}
        </Script>
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/107578899"
              style={{ position: 'absolute', left: '-9999px' }}
              alt=""
            />
          </div>
        </noscript>
      </body>
    </html>
  );
}
