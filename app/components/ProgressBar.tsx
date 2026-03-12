'use client';

import { useState, useEffect } from 'react';

export default function ProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const viewHeight = window.innerHeight;
      const maxScroll = docHeight - viewHeight;
      if (maxScroll > 0) {
        setProgress((scrollY / maxScroll) * 100);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-[2px] z-50">
      <div
        className="h-full bg-black transition-[width] duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
