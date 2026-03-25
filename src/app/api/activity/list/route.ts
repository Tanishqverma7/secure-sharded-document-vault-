import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    
    const activities = await db.activity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { file: { select: { fileName: true } } },
    });
    
    const list = activities.map(a => ({
      id: a.id,
      action: a.action,
      status: a.status,
      details: JSON.parse(a.details || '{}'),
      file_name: a.file?.fileName || null,
      created_at: a.createdAt.toISOString(),
    }));
    
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error('[Activity] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
