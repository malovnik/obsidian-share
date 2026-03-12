export interface NoteCard {
  id: string;
  slug: string;
  title: string;
  snippet: string;
  tags: string[];
  readingTime: number;
  createdAt: string;
  viewCount: number;
}

export interface SearchResult extends NoteCard {
  relevance: number;
}

export interface FeedResponse {
  notes: NoteCard[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    limit: number;
  };
}

export interface SearchResponse {
  notes: SearchResult[];
  pagination: {
    hasMore: boolean;
    offset: number;
    limit: number;
  };
}

export interface TagInfo {
  name: string;
  count: number;
}

export interface RelatedArticle {
  id: string;
  slug: string;
  title: string;
  tags: string[];
}
