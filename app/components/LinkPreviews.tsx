'use client';

import { useEffect } from 'react';

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function createPreviewCard(href: string, domain: string): HTMLAnchorElement {
  const card = document.createElement('a');
  card.href = href;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';
  card.className = 'link-preview';

  const domainEl = document.createElement('span');
  domainEl.className = 'link-preview__domain';
  domainEl.textContent = domain;

  const titleEl = document.createElement('span');
  titleEl.className = 'link-preview__title';
  titleEl.textContent = 'Загрузка...';

  const urlEl = document.createElement('span');
  urlEl.className = 'link-preview__url';
  urlEl.textContent = href;

  card.appendChild(domainEl);
  card.appendChild(titleEl);
  card.appendChild(urlEl);

  return card;
}

export default function LinkPreviews() {
  useEffect(() => {
    const article = document.querySelector('.markdown-body');
    if (!article) return;

    const paragraphs = article.querySelectorAll('p');

    paragraphs.forEach((p) => {
      const links = p.querySelectorAll('a');
      if (links.length !== 1) return;

      const link = links[0];
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('http')) return;

      if (p.textContent?.trim() !== link.textContent?.trim()) return;

      if (p.querySelector('.link-preview')) return;

      const domain = getDomain(href);
      const card = createPreviewCard(href, domain);

      p.replaceChildren(card);

      fetch(`/api/link-preview?url=${encodeURIComponent(href)}`)
        .then((res) => res.json())
        .then((data) => {
          const titleEl = card.querySelector('.link-preview__title');
          if (titleEl && data.title) {
            titleEl.textContent = data.title;
          } else if (titleEl) {
            titleEl.textContent = href;
          }
        })
        .catch(() => {
          const titleEl = card.querySelector('.link-preview__title');
          if (titleEl) {
            titleEl.textContent = href;
          }
        });
    });
  }, []);

  return null;
}
