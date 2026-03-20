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
  coverImageId: string | null;
}

function cleanTitle(title: string): string {
  return title
    .replace(/_/g, ' ')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export default function ArticleCard({
  slug,
  title,
  snippet,
  tags,
  readingTime,
  createdAt,
  coverImageId,
}: ArticleCardProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const displayTitle = cleanTitle(title);
  const firstLetter = displayTitle.charAt(0).toUpperCase();

  return (
    <Link
      href={`/s/${slug}`}
      className="group block hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="relative bg-gray-50 border-2 border-black aspect-[16/9] flex items-center justify-center overflow-hidden">
        {coverImageId ? (
          <img
            src={`/api/images/${coverImageId}`}
            alt={displayTitle}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-[1.02] transition-all duration-700 ease-out"
            loading="lazy"
          />
        ) : (
          <>
            <span className="absolute top-3 left-4 text-[72px] font-black text-black/[0.04] leading-none select-none">
              {firstLetter}
            </span>
            <h3 className="text-black font-semibold text-base leading-snug line-clamp-3 text-center relative z-10 p-6">
              {displayTitle}
            </h3>
          </>
        )}
      </div>

      <div className="border-2 border-t-0 border-black p-4">
        {coverImageId && (
          <h3 className="text-black font-semibold text-sm leading-snug line-clamp-2 mb-2">
            {displayTitle}
          </h3>
        )}

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
