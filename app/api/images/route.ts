import { NextRequest, NextResponse } from 'next/server';
import { customAlphabet } from 'nanoid';
import sharp from 'sharp';
import { db } from '@/lib/db';
import { images } from '@/lib/db/schema';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 12);

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20 MB до конвертации
const WEBP_QUALITY = 82;
const MAX_WIDTH = 1920;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename, data: base64Data, noteId } = body;

    if (!filename || !base64Data) {
      return NextResponse.json(
        { error: 'filename and data are required' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: `Image too large: ${Math.round(buffer.length / 1024 / 1024)}MB, max ${MAX_IMAGE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      );
    }

    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      return NextResponse.json(
        { error: 'Invalid image file' },
        { status: 400 }
      );
    }

    let pipeline = sharp(buffer);

    if (metadata.width > MAX_WIDTH) {
      pipeline = pipeline.resize(MAX_WIDTH, null, { withoutEnlargement: true });
    }

    const webpBuffer = await pipeline
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const webpMeta = await sharp(webpBuffer).metadata();

    const id = nanoid();

    await db.insert(images).values({
      id,
      noteId: noteId || null,
      filename: filename.replace(/\.[^.]+$/, '.webp'),
      data: webpBuffer,
      mimeType: 'image/webp',
      width: webpMeta.width || null,
      height: webpMeta.height || null,
      size: webpBuffer.length,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://read.malovnik.ru';

    return NextResponse.json({
      success: true,
      id,
      url: `${baseUrl}/api/images/${id}`,
      width: webpMeta.width,
      height: webpMeta.height,
      size: webpBuffer.length,
      originalSize: buffer.length,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}
