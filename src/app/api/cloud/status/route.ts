import { NextResponse } from 'next/server';
import { getProviderStats } from '@/lib/cloud';
import { db } from '@/lib/db';

export async function GET() {
  const baseProviders = getProviderStats();
  
  const stats = {
    google_drive: { count: 0, bytes: 0 },
    dropbox: { count: 0, bytes: 0 },
    cloudinary: { count: 0, bytes: 0 },
  };

  const files = await db.file.findMany({
    select: { shardA: true, shardB: true, parity: true, shardSize: true }
  });

  for (const f of files) {
    if (f.shardA) { stats.google_drive.count++; stats.google_drive.bytes += f.shardSize; }
    if (f.shardB) { stats.dropbox.count++; stats.dropbox.bytes += f.shardSize; }
    if (f.parity) { stats.cloudinary.count++; stats.cloudinary.bytes += f.shardSize; }
  }
  
  return NextResponse.json({
    success: true,
    data: {
      providers: baseProviders.map(p => ({
        name: p.provider,
        display_name: p.provider === 'google_drive' ? 'Google Drive' :
                     p.provider === 'dropbox' ? 'Dropbox' : 'Cloudinary',
        status: p.status,
        health: p.status,
        file_count: stats[p.provider as keyof typeof stats]?.count || 0,
        storage_used: stats[p.provider as keyof typeof stats]?.bytes || 0,
      })),
    },
  });
}
