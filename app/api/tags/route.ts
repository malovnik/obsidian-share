import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import type { TagInfo } from '@/types/contracts';

export async function GET() {
  try {
    const result = await db.execute(
      sql`SELECT unnest(tags) as name, COUNT(*)::int as count
        FROM notes
        WHERE no_index = false AND is_deleted = false
        GROUP BY name
        ORDER BY count DESC, name ASC`
    );

    const tags: TagInfo[] = (result as unknown as Array<Record<string, unknown>>).map((row) => ({
      name: String(row.name),
      count: Number(row.count),
    }));

    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Tags API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}
