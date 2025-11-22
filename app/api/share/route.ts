import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { marked } from 'marked';
import { db } from '@/lib/db';
import { notes } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, theme = 'default', customCss, password, expiresInDays } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const id = nanoid(8);
    const htmlContent = await marked(content);

    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const [note] = await db
      .insert(notes)
      .values({
        id,
        title,
        content,
        htmlContent,
        theme,
        customCss,
        password,
        expiresAt,
      })
      .returning();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const shareUrl = `${baseUrl}/s/${id}`;

    return NextResponse.json({
      success: true,
      id: note.id,
      url: shareUrl,
      expiresAt: note.expiresAt,
    });
  } catch (error) {
    console.error('Share error:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
