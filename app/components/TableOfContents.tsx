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
    <nav>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
        Содержание
      </p>
      <ul className="space-y-0">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={`block py-1.5 text-[13px] leading-normal border-l-2 transition-all duration-150 ${
                heading.level === 1
                  ? 'pl-3'
                  : heading.level === 2
                    ? 'pl-3'
                    : 'pl-6'
              } ${
                activeId === heading.id
                  ? 'border-black text-black font-medium'
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
              }`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
