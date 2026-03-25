import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { reconstructData } from '@/lib/sharding';
import { downloadShard, CLOUD_PROVIDERS, isFailureSimulated } from '@/lib/cloud';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const fileId = request.nextUrl.pathname.split('/').pop();
    const encryptionPassword = request.nextUrl.searchParams.get('encryption_password');
    
    if (!encryptionPassword) {
      return NextResponse.json(
        { success: false, error: 'Encryption password is required' },
        { status: 400 }
      );
    }
    
    // Get file metadata
    const file = await db.file.findFirst({
      where: { id: fileId, userId: user.id },
    });
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }
    
    console.log(`[Download] Processing file: ${file.fileName}`);
    
    // Download shards from cloud
    const shards: {
      shardA: Buffer | null;
      shardB: Buffer | null;
      parity: Buffer | null;
    } = {
      shardA: null,
      shardB: null,
      parity: null,
    };
    
    let recoveryUsed = false;
    const failedProviders: string[] = [];
    
    // Try to download each shard
    if (file.shardA) {
      try {
        shards.shardA = await downloadShard(file.shardA);
        console.log(`[Download] Retrieved Shard A from ${CLOUD_PROVIDERS.shardA}`);
      } catch (e) {
        failedProviders.push(CLOUD_PROVIDERS.shardA);
        console.log(`[Download] Failed to retrieve Shard A: ${(e as Error).message}`);
      }
    }
    
    if (file.shardB) {
      try {
        shards.shardB = await downloadShard(file.shardB);
        console.log(`[Download] Retrieved Shard B from ${CLOUD_PROVIDERS.shardB}`);
      } catch (e) {
        failedProviders.push(CLOUD_PROVIDERS.shardB);
        console.log(`[Download] Failed to retrieve Shard B: ${(e as Error).message}`);
      }
    }
    
    if (file.parity) {
      try {
        shards.parity = await downloadShard(file.parity);
        console.log(`[Download] Retrieved Parity from ${CLOUD_PROVIDERS.parity}`);
      } catch (e) {
        failedProviders.push(CLOUD_PROVIDERS.parity);
        console.log(`[Download] Failed to retrieve Parity: ${(e as Error).message}`);
      }
    }
    
    // Count available shards
    const availableShards = Object.values(shards).filter(s => s !== null).length;
    
    if (availableShards < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient shards for recovery',
          details: {
            availableShards,
            required: 2,
            failedProviders,
          },
        },
        { status: 500 }
      );
    }
    
    // Reconstruct if needed
    if (availableShards < 3) {
      console.log('[Download] Initiating shard recovery...');
      recoveryUsed = true;
    }
    
    // Reconstruct encrypted data
    const encryptedData = reconstructData(
      shards.shardA,
      shards.shardB,
      shards.parity,
      file.encryptedSize,
      file.shardSize
    );
    
    // Decrypt
    console.log('[Download] Decrypting file...');
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
        details: JSON.stringify({
          fileName: file.fileName,
          recoveryUsed,
          shardsAvailable: availableShards,
          failedProviders,
        }),
      },
    });
    
    // Update file status if recovery was used
    if (recoveryUsed && file.status === 'healthy') {
      await db.file.update({
        where: { id: file.id },
        data: { status: 'recovered' },
      });
    }
    
    console.log(`[Download] File downloaded successfully: ${file.fileName}`);
    
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
    console.error('Download error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
