// RAID-5 Sharding Service with XOR Parity

export interface Shards {
  shardA: Buffer;
  shardB: Buffer;
  parity: Buffer;
  originalSize: number;
  shardSize: number;
}

/**
 * XOR two buffers (must be same length)
 */
function xorBuffers(a: Buffer, b: Buffer): Buffer {
  if (a.length !== b.length) {
    throw new Error('Buffers must be same length for XOR');
  }
  const result = Buffer.alloc(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] ^ b[i];
  }
  return result;
}

/**
 * Split data into 2 data shards and 1 parity shard
 */
export function createShards(data: Buffer): Shards {
  const originalSize = data.length;
  const mid = Math.ceil(originalSize / 2);
  
  const shardA = data.subarray(0, mid);
  let shardB = data.subarray(mid);
  
  // Pad shardB to match shardA length
  if (shardB.length < shardA.length) {
    shardB = Buffer.concat([shardB, Buffer.alloc(shardA.length - shardB.length)]);
  }
  
  // Calculate parity: A XOR B
  const parity = xorBuffers(shardA, shardB);
  
  return {
    shardA,
    shardB,
    parity,
    originalSize,
    shardSize: shardA.length,
  };
}

/**
 * Reconstruct data from any 2 of 3 shards
 */
export function reconstructData(
  shardA: Buffer | null,
  shardB: Buffer | null,
  parity: Buffer | null,
  encryptedSize: number,
  shardSize: number
): Buffer {
  const available = [shardA, shardB, parity].filter(s => s !== null).length;
  
  if (available < 2) {
    throw new Error(`Insufficient shards: ${available}/2 required`);
  }
  
  let actualShardA = shardA;
  let actualShardB = shardB;
  
  // Reconstruct missing shard if needed
  if (!actualShardA && actualShardB && parity) {
    console.log('[Sharding] Reconstructing Shard A...');
    actualShardA = xorBuffers(actualShardB, parity);
  }
  
  if (!actualShardB && actualShardA && parity) {
    console.log('[Sharding] Reconstructing Shard B...');
    actualShardB = xorBuffers(actualShardA, parity);
  }
  
  if (!actualShardA || !actualShardB) {
    throw new Error('Failed to reconstruct shards');
  }
  
  // Merge shards and trim to encrypted size
  const merged = Buffer.concat([actualShardA, actualShardB]);
  return merged.subarray(0, encryptedSize);
}
