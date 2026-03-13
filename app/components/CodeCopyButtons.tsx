'use client';

import { useEffect } from 'react';

function createSvgIcon(type: 'copy' | 'check'): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');

  if (type === 'copy') {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '9');
    rect.setAttribute('y', '9');
    rect.setAttribute('width', '13');
    rect.setAttribute('height', '13');
    rect.setAttribute('rx', '2');
    svg.appendChild(rect);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1');
    svg.appendChild(path);
  } else {
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', '20 6 9 17 4 12');
    svg.appendChild(polyline);
  }

  return svg;
}

export default function CodeCopyButtons() {
  useEffect(() => {
    const preBlocks = document.querySelectorAll('.markdown-body pre');

    preBlocks.forEach((pre) => {
      if (pre.querySelector('.copy-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.title = 'Копировать';
      btn.appendChild(createSvgIcon('copy'));

      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code');
        const text = code?.textContent || pre.textContent || '';

        try {
          await navigator.clipboard.writeText(text);
          btn.classList.add('copied');
          btn.replaceChildren(createSvgIcon('check'));

          setTimeout(() => {
            btn.classList.remove('copied');
            btn.replaceChildren(createSvgIcon('copy'));
          }, 2000);
        } catch {
          /* clipboard not available */
        }
      });

      (pre as HTMLElement).style.position = 'relative';
      pre.appendChild(btn);
    });
  }, []);

  return null;
}
