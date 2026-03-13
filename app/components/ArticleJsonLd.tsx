interface ArticleJsonLdProps {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
  authorName: string;
  tags: string[];
  imageUrl: string;
  wordCount: number;
}

export default function ArticleJsonLd({
  title,
  description,
  url,
  datePublished,
  dateModified,
  authorName,
  tags,
  imageUrl,
  wordCount,
}: ArticleJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url,
    datePublished,
    dateModified,
    wordCount,
    inLanguage: 'ru',
    author: {
      '@type': 'Person',
      name: authorName,
      url: 'https://read.malovnik.ru',
    },
    publisher: {
      '@type': 'Person',
      name: authorName,
    },
    image: imageUrl,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    ...(tags.length > 0 && { keywords: tags.join(', ') }),
  };

  // JSON.stringify produces safe output for JSON-LD —
  // no HTML entities can escape the <script type="application/ld+json"> context
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
