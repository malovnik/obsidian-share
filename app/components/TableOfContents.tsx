'use client';

import { useState, useEffect } from 'react';

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

export default function TableOfContents() {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const article = document.querySelector('.markdown-body');
    if (!article) return;

    const elements = article.querySelectorAll('h1, h2, h3');
    const items: HeadingItem[] = [];

    elements.forEach((el, index) => {
      if (!el.id) {
        el.id = `heading-${index}`;
      }
      items.push({
        id: el.id,
        text: el.textContent || '',
        level: parseInt(el.tagName[1]),
      });
    });

    setHeadings(items);
  }, []);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    headings.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="space-y-1">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
        Содержание
      </p>
      {headings.map((heading) => (
        <a
          key={heading.id}
          href={`#${heading.id}`}
          className={`block text-sm leading-relaxed transition-colors ${
            heading.level === 2 ? 'pl-0' : heading.level === 3 ? 'pl-3' : ''
          } ${
            activeId === heading.id
              ? 'font-semibold text-black'
              : 'text-gray-400 hover:text-gray-700'
          }`}
        >
          {heading.text}
        </a>
      ))}
    </nav>
  );
}
