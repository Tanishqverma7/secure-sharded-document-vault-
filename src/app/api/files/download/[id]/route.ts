import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { reconstructData } from '@/lib/sharding';
import { downloadShard } from '@/lib/cloud';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(request);
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id: fileId } = await params;
    const encryptionPassword = request.nextUrl.searchParams.get('password');
    
    if (!encryptionPassword) {
      return NextResponse.json({ success: false, error: 'Encryption password required' }, { status: 400 });
    }
    
    const file = await db.file.findFirst({
      where: { id: fileId, userId: user.id },
    });
    
    if (!file) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }
    
    console.log(`[Download] Processing: ${file.fileName}`);
    
    // Download shards
    let shardA: Buffer | null = null;
    let shardB: Buffer | null = null;
    let parity: Buffer | null = null;
    
    if (file.shardA) {
      try {
        shardA = await downloadShard(file.shardA);
      } catch (e) {
        console.error(`[Download] Shard A failed: ${(e as Error).message}`);
      }
    }
    
    if (file.shardB) {
      try {
        shardB = await downloadShard(file.shardB);
      } catch (e) {
        console.error(`[Download] Shard B failed: ${(e as Error).message}`);
      }
    }
    
    if (file.parity) {
      try {
        parity = await downloadShard(file.parity);
      } catch (e) {
        console.error(`[Download] Parity failed: ${(e as Error).message}`);
      }
    }
    
    const availableShards = [shardA, shardB, parity].filter(Boolean).length;
    
    if (availableShards < 2) {
      return NextResponse.json(
        { success: false, error: 'Not enough shards available' },
        { status: 500 }
      );
    }
    
    const recoveryUsed = availableShards < 3;
    
    if (recoveryUsed) {
      console.log(`[Download] Using RAID recovery`);
    }
    
    // Reconstruct encrypted data
    const encryptedData = reconstructData(
      shardA,
      shardB,
      parity,
      file.encryptedSize,
      file.shardSize
    );
    
    // Decrypt
    const decryptedData = decrypt(
      encryptedData.toString('base64'),
      encryptionPassword,
      file.salt,
      file.iv,
      file.authTag
    );
    
    // Trim to original size
    const finalData = decryptedData.subarray(0, file.fileSize);
    
    // Log activity
    await db.activity.create({
      data: {
        userId: user.id,
        fileId: file.id,
        action: 'download',
        status: 'success',
        details: JSON.stringify({ fileName: file.fileName, recoveryUsed }),
      },
    });
    
    // Update status if recovery was used
    if (recoveryUsed && file.status === 'healthy') {
      await db.file.update({
        where: { id: file.id },
        data: { status: 'recovered' },
      });
    }
    
    console.log(`[Download] Success: ${file.fileName}`);
    
    return NextResponse.json({
      success: true,
      data: {
        file_name: file.fileName,
        file_data: finalData.toString('base64'),
        file_size: finalData.length,
        recovery_used: recoveryUsed,
      },
    });
  } catch (error) {
    console.error('[Download] Error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Internal error' },
      { status: 500 }
    );
  }
}
