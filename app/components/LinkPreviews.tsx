'use client';

import { useEffect } from 'react';

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function isRawUrl(link: HTMLAnchorElement): boolean {
  const href = link.getAttribute('href') || '';
  const text = link.textContent?.trim() || '';
  if (!href.startsWith('http')) return false;
  return text === href || text === decodeURIComponent(href);
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
  urlEl.textContent = href.length > 60 ? href.substring(0, 60) + '...' : href;

  card.appendChild(domainEl);
  card.appendChild(titleEl);
  card.appendChild(urlEl);

  return card;
}

function fetchTitle(href: string): Promise<string | null> {
  return fetch(`/api/link-preview?url=${encodeURIComponent(href)}`)
    .then((res) => res.json())
    .then((data) => data.title || null)
    .catch(() => null);
}

export default function LinkPreviews() {
  useEffect(() => {
    const article = document.querySelector('.markdown-body');
    if (!article) return;

    const allLinks = article.querySelectorAll('a');

    allLinks.forEach((link) => {
      if (!isRawUrl(link)) return;
      if (link.closest('.link-preview')) return;
      if (link.dataset.previewProcessed) return;
      link.dataset.previewProcessed = '1';

      const href = link.getAttribute('href')!;
      const paragraph = link.closest('p');
      if (!paragraph) return;

      const isBareLink = paragraph.textContent?.trim() === link.textContent?.trim();

      if (isBareLink) {
        const domain = getDomain(href);
        const card = createPreviewCard(href, domain);
        paragraph.replaceChildren(card);

        fetchTitle(href).then((title) => {
          const titleEl = card.querySelector('.link-preview__title');
          if (titleEl) {
            titleEl.textContent = title || href;
          }
        });
      } else {
        link.classList.add('link-preview-inline');
        link.textContent = 'Загрузка...';

        fetchTitle(href).then((title) => {
          if (title) {
            link.textContent = title;
            link.title = href;
          } else {
            link.textContent = getDomain(href);
            link.title = href;
          }
        });
      }
    });
  }, []);

  return null;
}
