'use client';

import { useEffect, useState } from 'react';

interface ReadingPositionProps {
  articleId: string;
}

const STORAGE_KEY = 'reading-positions';
const MAX_ENTRIES = 50;

function getPositions(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function savePosition(articleId: string, scrollPercent: number) {
  const positions = getPositions();
  positions[articleId] = scrollPercent;

  const entries = Object.entries(positions);
  if (entries.length > MAX_ENTRIES) {
    const trimmed = Object.fromEntries(entries.slice(-MAX_ENTRIES));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  }
}

export default function ReadingPosition({ articleId }: ReadingPositionProps) {
  const [showResume, setShowResume] = useState(false);
  const [savedPercent, setSavedPercent] = useState(0);

  useEffect(() => {
    const positions = getPositions();
    const saved = positions[articleId];
    if (saved && saved > 5 && saved < 95) {
      setSavedPercent(saved);
      setShowResume(true);
    }
  }, [articleId]);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight > 0) {
          const percent = Math.round((scrollTop / docHeight) * 100);
          savePosition(articleId, percent);
        }
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [articleId]);

  const handleResume = () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const targetScroll = (savedPercent / 100) * docHeight;
    window.scrollTo({ top: targetScroll, behavior: 'smooth' });
    setShowResume(false);
  };

  if (!showResume) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-fade-in">
      <button
        onClick={handleResume}
        className="bg-black text-white text-sm px-4 py-2.5 shadow-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
      >
        <span>Продолжить чтение</span>
        <span className="text-white/60 text-xs">{savedPercent}%</span>
      </button>
      <button
        onClick={() => setShowResume(false)}
        className="absolute -top-2 -right-2 w-5 h-5 bg-gray-200 text-gray-600 text-xs flex items-center justify-center hover:bg-gray-300"
        aria-label="Закрыть"
      >
        x
      </button>
    </div>
  );
}
