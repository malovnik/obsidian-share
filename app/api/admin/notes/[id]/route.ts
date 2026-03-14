import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notes, images } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isAdminAuthenticated } from '@/lib/auth/admin';
import { customAlphabet } from 'nanoid';
import sharp from 'sharp';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 12);

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const [updated] = await db
      .update(notes)
      .set({ isDeleted: true })
      .where(eq(notes.id, id))
      .returning({ id: notes.id, title: notes.title });

    if (!updated) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: updated,
    });
  } catch (error) {
    console.error('Admin delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}

const MAX_COVER_SIZE = 10 * 1024 * 1024;
const WEBP_QUALITY = 82;
const COVER_WIDTH = 1200;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { action, imageData, filename } = body;

    if (action === 'remove-cover') {
      await db
        .update(notes)
        .set({ coverImageId: null, updatedAt: new Date() })
        .where(eq(notes.id, id));

      return NextResponse.json({ success: true, coverImageId: null });
    }

    if (action === 'set-cover' && imageData) {
      const buffer = Buffer.from(imageData, 'base64');

      if (buffer.length > MAX_COVER_SIZE) {
        return NextResponse.json(
          { error: 'Image too large' },
          { status: 413 }
        );
      }

      let pipeline = sharp(buffer);
      const metadata = await pipeline.metadata();

      if (metadata.width && metadata.width > COVER_WIDTH) {
        pipeline = sharp(buffer).resize(COVER_WIDTH, null, { withoutEnlargement: true });
      }

      const webpBuffer = await pipeline.webp({ quality: WEBP_QUALITY }).toBuffer();
      const webpMeta = await sharp(webpBuffer).metadata();

      const imageId = nanoid();

      await db.insert(images).values({
        id: imageId,
        noteId: id,
        filename: (filename || 'cover').replace(/\.[^.]+$/, '.webp'),
        data: webpBuffer,
        mimeType: 'image/webp',
        width: webpMeta.width || null,
        height: webpMeta.height || null,
        size: webpBuffer.length,
      });

      await db
        .update(notes)
        .set({ coverImageId: imageId, updatedAt: new Date() })
        .where(eq(notes.id, id));

      return NextResponse.json({
        success: true,
        coverImageId: imageId,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin cover update error:', error);
    return NextResponse.json(
      { error: 'Failed to update cover' },
      { status: 500 }
    );
  }
}
