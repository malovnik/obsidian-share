import { Suspense } from 'react';
import NotesFeed from './components/NotesFeed';

export default function Home() {
  return (
    <Suspense fallback={null}>
      <NotesFeed />
    </Suspense>
  );
}
