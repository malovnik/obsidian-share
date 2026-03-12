import Link from 'next/link';

interface ArticleCardProps {
  id: string;
  slug: string;
  title: string;
  snippet: string;
  tags: string[];
  readingTime: number;
  createdAt: string;
  viewCount: number;
}

export default function ArticleCard({
  id,
  slug,
  title,
  snippet,
  tags,
  readingTime,
  createdAt,
}: ArticleCardProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      href={`/s/${slug}`}
      className="group block hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Placeholder cover — black bg, white title */}
      <div className="relative bg-black aspect-[16/9] md:aspect-[4/5] flex flex-col justify-end p-5">
        <h3 className="text-white font-semibold text-lg leading-snug line-clamp-3">
          {title}
        </h3>
        <div className="mt-3 border-t border-white/30 w-full" />
      </div>

      {/* Card body */}
      <div className="border border-t-0 border-gray-200 p-4">
        <h4 className="text-base font-semibold text-black line-clamp-2 mb-1.5">
          {title}
        </h4>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">
          {snippet}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="bg-gray-100 text-gray-700 rounded-sm px-2 py-0.5 text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{formattedDate}</span>
          {readingTime > 0 && <span>{readingTime} мин</span>}
        </div>
      </div>
    </Link>
  );
}
