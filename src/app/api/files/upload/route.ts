import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { encrypt } from '@/lib/encryption';
import { createShards } from '@/lib/sharding';
import { uploadShard, CLOUD_PROVIDERS } from '@/lib/cloud';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);
    
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { file_name, file_data, encryption_password } = body;
    
    if (!file_name || !file_data || !encryption_password) {
      return NextResponse.json(
        { success: false, error: 'File name, data, and password required' },
        { status: 400 }
      );
    }
    
    console.log(`[Upload] Processing: ${file_name}`);
    
    const uploadStart = Date.now();
    
    // Decode base64 file data
    const fileBuffer = Buffer.from(file_data, 'base64');
    
    // Encrypt
    const encrypted = encrypt(fileBuffer, encryption_password);
    const encryptedBuffer = Buffer.from(encrypted.encryptedData, 'base64');
    
    // Create shards
    const shards = createShards(encryptedBuffer);
    
    // Upload to cloud providers
    const cloudIds: Record<string, string> = {};
    
    try {
      cloudIds.shardA = await uploadShard(CLOUD_PROVIDERS.shardA, shards.shardA);
    } catch (e) {
      console.error(`[Upload] Shard A failed: ${(e as Error).message}`);
    }
    
    try {
      cloudIds.shardB = await uploadShard(CLOUD_PROVIDERS.shardB, shards.shardB);
    } catch (e) {
      console.error(`[Upload] Shard B failed: ${(e as Error).message}`);
    }
    
    try {
      cloudIds.parity = await uploadShard(CLOUD_PROVIDERS.parity, shards.parity);
    } catch (e) {
      console.error(`[Upload] Parity failed: ${(e as Error).message}`);
    }
    
    const uploadDuration = (Date.now() - uploadStart) / 1000;
    
    if (Object.keys(cloudIds).length < 2) {
      return NextResponse.json(
        { success: false, error: 'Not enough shards uploaded' },
        { status: 500 }
      );
    }
    
    const status = Object.keys(cloudIds).length === 3 ? 'healthy' : 'degraded';
    
    // Save to DB
    const file = await db.file.create({
      data: {
        userId: user.id,
        fileName: file_name,
        fileSize: fileBuffer.length,
        encryptedSize: encryptedBuffer.length,
        shardSize: shards.shardSize,
        status,
        shardA: cloudIds.shardA || null,
        shardB: cloudIds.shardB || null,
        parity: cloudIds.parity || null,
        salt: encrypted.salt,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        uploadDuration,
      },
    });
    
    // Log activity
    await db.activity.create({
      data: {
        userId: user.id,
        fileId: file.id,
        action: 'upload',
        status: 'success',
        details: JSON.stringify({ fileName: file_name, shards: Object.keys(cloudIds).length }),
      },
    });
    
    console.log(`[Upload] Success: ${file_name}`);
    
    return NextResponse.json({
      success: true,
      data: {
        file_id: file.id,
        file_name,
        file_size: fileBuffer.length,
        status,
        shards_uploaded: Object.keys(cloudIds).length,
        upload_duration: uploadDuration,
      },
    });
  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
