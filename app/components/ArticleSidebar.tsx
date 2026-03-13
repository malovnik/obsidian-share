'use client';

import TableOfContents from './TableOfContents';

export default function ArticleSidebar() {
  return (
    <aside className="hidden lg:block w-56 shrink-0">
      <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-hide">
        <TableOfContents />
      </div>
    </aside>
  );
}
