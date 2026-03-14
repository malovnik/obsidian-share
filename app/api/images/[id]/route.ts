import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { images } from '@/lib/db/schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const results = await db
      .select({
        data: images.data,
        mimeType: images.mimeType,
        filename: images.filename,
      })
      .from(images)
      .where(eq(images.id, id))
      .limit(1);

    const image = results[0];

    if (!image) {
      return new NextResponse('Not found', { status: 404 });
    }

    return new NextResponse(new Uint8Array(image.data), {
      status: 200,
      headers: {
        'Content-Type': image.mimeType,
        'Content-Length': String(image.data.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${image.filename}"`,
      },
    });
  } catch (error) {
    console.error('Image serve error:', error);
    return new NextResponse('Server error', { status: 500 });
  }
}
