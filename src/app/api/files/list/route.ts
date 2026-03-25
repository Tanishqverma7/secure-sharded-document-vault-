import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const files = await db.file.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    
    const fileList = files.map(f => ({
      file_id: f.id,
      file_name: f.fileName,
      file_size: f.fileSize,
      status: f.status,
      shards_count: [f.shardA, f.shardB, f.parity].filter(Boolean).length,
      created_at: f.createdAt.toISOString(),
      upload_duration: f.uploadDuration,
    }));
    
    return NextResponse.json({ success: true, data: fileList });
  } catch (error) {
    console.error('[List] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
