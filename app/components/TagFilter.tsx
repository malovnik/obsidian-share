'use client';

import type { TagInfo } from '@/types/contracts';

interface TagFilterProps {
  tags: TagInfo[];
  activeTags: string[];
  onToggle: (tag: string) => void;
}

export default function TagFilter({ tags, activeTags, onToggle }: TagFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 pb-1">
        {tags.map((tag) => {
          const isActive = activeTags.includes(tag.name);
          return (
            <button
              key={tag.name}
              onClick={() => onToggle(tag.name)}
              className={`whitespace-nowrap rounded-sm px-3 py-1 text-sm border transition-colors ${
                isActive
                  ? 'bg-black text-white border-black'
                  : 'bg-white/70 backdrop-blur text-gray-700 border-gray-200 hover:border-gray-400'
              }`}
            >
              {tag.name}
              <span className="ml-1.5 text-xs opacity-60">{tag.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
