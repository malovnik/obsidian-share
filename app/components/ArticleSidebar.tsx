'use client';

import TableOfContents from './TableOfContents';

export default function ArticleSidebar() {
  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-20">
        <TableOfContents />
      </div>
    </aside>
  );
}
