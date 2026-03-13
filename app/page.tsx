import { Suspense } from 'react';
import type { Metadata } from 'next';
import NotesFeed from './components/NotesFeed';

export const metadata: Metadata = {
  title: 'Малов НикИИта 🍳 Жарю ИИшку',
  description: 'Заметки об AI, разработке, продуктивности и не только. Личный блог Никиты Малова.',
  keywords: ['заметки', 'AI', 'разработка', 'продуктивность', 'малов никита', 'блог'],
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  return (
    <Suspense fallback={null}>
      <NotesFeed />
    </Suspense>
  );
}
