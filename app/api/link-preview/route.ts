import { NextRequest, NextResponse } from 'next/server';

const FETCH_TIMEOUT = 5000;
const titleCache = new Map<string, { title: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const cached = titleCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(
      { title: cached.title, url },
      { headers: { 'Cache-Control': 'public, max-age=86400' } }
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)',
        'Accept': 'text/html',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ title: null, url });
    }

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);

    const title = ogTitleMatch?.[1] || titleMatch?.[1] || null;
    const cleanTitle = title?.trim().replace(/\s+/g, ' ') || null;

    if (cleanTitle) {
      titleCache.set(url, { title: cleanTitle, timestamp: Date.now() });
    }

    return NextResponse.json(
      { title: cleanTitle, url },
      { headers: { 'Cache-Control': 'public, max-age=86400' } }
    );
  } catch {
    return NextResponse.json({ title: null, url });
  }
}
