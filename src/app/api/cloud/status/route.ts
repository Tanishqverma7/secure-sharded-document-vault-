import { NextResponse } from 'next/server';
import { getProviderStats } from '@/lib/cloud';

export async function GET() {
  const providers = getProviderStats();
  
  return NextResponse.json({
    success: true,
    data: {
      providers: providers.map(p => ({
        name: p.provider,
        display_name: p.provider === 'google_drive' ? 'Google Drive' :
                     p.provider === 'dropbox' ? 'Dropbox' : 'Cloudinary',
        status: p.status,
        health: p.status,
        file_count: p.shards,
        storage_used: p.bytes,
      })),
    },
  });
}
