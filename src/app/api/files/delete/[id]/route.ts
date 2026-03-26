import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { deleteShard } from '@/lib/cloud';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    
    const { id: fileId } = await params;
    const file = await db.file.findFirst({ where: { id: fileId, userId: user.id } });
    if (!file) return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    
    if (file.shardA) { try { await deleteShard(file.shardA); } catch(e) { console.error(e); } }
    if (file.shardB) { try { await deleteShard(file.shardB); } catch(e) { console.error(e); } }
    if (file.parity) { try { await deleteShard(file.parity); } catch(e) { console.error(e); } }
    
    // Delete file from db
    await db.file.delete({
      where: { id: fileId },
    });
    
    // Log activity
    await db.activity.create({
      data: {
        userId: user.id,
        action: 'delete',
        status: 'success',
        details: JSON.stringify({ fileName: file.fileName }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
