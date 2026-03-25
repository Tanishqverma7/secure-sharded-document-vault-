import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    // Get file stats
    const stats = await db.file.aggregate({
      where: { userId: user.id },
      _sum: { fileSize: true },
      _count: true,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        files_count: stats._count,
        total_storage: stats._sum.fileSize || 0,
      },
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
