import { Suspense } from 'react';
import type { Metadata } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import Header from './components/Header';
import Footer from './components/Footer';
import YandexMetrikaHit from './components/YandexMetrikaHit';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Малов НикИИта 🍳 Жарю ИИшку',
    template: '%s | Малов Никита',
  },
  description: 'Заметки об AI, разработке, продуктивности и не только',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://read.malovnik.ru'),
  applicationName: 'Малов НикИИта 🍳 Жарю ИИшку',
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Малов НикИИта 🍳 Жарю ИИшку',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Малов НикИИта 🍳 Жарю ИИшку',
      },
    ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Малов НикИИта 🍳 Жарю ИИшку',
              url: process.env.NEXT_PUBLIC_BASE_URL || 'https://read.malovnik.ru',
              description: 'Заметки об AI, разработке, продуктивности и не только',
              author: {
                '@type': 'Person',
                name: 'Малов Никита',
                url: 'https://read.malovnik.ru',
              },
              inLanguage: 'ru',
            }),
          }}
        />
        <Suspense fallback={null}>
          <YandexMetrikaHit />
        </Suspense>
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
