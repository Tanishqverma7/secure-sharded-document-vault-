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
      select: { fileSize: true, status: true },
    });
    
    const stats = {
      total_files: files.length,
      total_size: files.reduce((sum, f) => sum + f.fileSize, 0),
      status_counts: {
        healthy: files.filter(f => f.status === 'healthy').length,
        recovered: files.filter(f => f.status === 'recovered').length,
        degraded: files.filter(f => f.status === 'degraded').length,
      },
    };
    
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('[Stats] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
