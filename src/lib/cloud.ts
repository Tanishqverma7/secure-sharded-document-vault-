// Cloud Storage Service - Multi-cloud implementation
import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import { google } from 'googleapis';
import { Dropbox } from 'dropbox';
import { v2 as cloudinary } from 'cloudinary';

export const CLOUD_PROVIDERS = {
  shardA: 'google_drive',
  shardB: 'dropbox',
  parity: 'cloudinary',
} as const;

// Configure clients lazily to prevent errors if variables are not set during build/import
function getDrive() {
  let privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY || '';
  
  // Bulletproof PEM reconstructor to bypass any .env escaping issues
  const match = privateKey.match(/-----BEGIN PRIVATE KEY-----([^]*?)-----END PRIVATE KEY-----/);
  if (match) {
    const base64 = match[1].replace(/[^a-zA-Z0-9+/=]/g, '');
    const chunks = base64.match(/.{1,64}/g) || [];
    privateKey = `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----\n`;
  }
  
  return google.drive({
    version: 'v3',
    auth: new google.auth.JWT({
      email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    }),
  });
}

function getDropbox() {
  return new Dropbox({
    accessToken: process.env.DROPBOX_ACCESS_TOKEN,
    fetch: fetch,
  });
}

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

// Simulated failure tracking for testing purposes
const failureSimulated: Map<string, boolean> = new Map();

export async function uploadShard(provider: string, data: Buffer): Promise<string> {
  if (failureSimulated.get(provider)) {
    throw new Error(`${provider}: Simulated failure`);
  }
  
  const idStr = randomUUID();
  let id = '';

  switch (provider) {
    case 'google_drive': {
      const drive = getDrive();
      const res = await drive.files.create({
        requestBody: {
          name: idStr,
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
        },
        media: {
          mimeType: 'application/octet-stream',
          body: Readable.from(data),
        },
      });
      id = res.data.id!;
      break;
    }
    case 'dropbox': {
      const dbx = getDropbox();
      const res = await dbx.filesUpload({
        path: `/vault/${idStr}`,
        contents: data,
      });
      id = res.result.id;
      break;
    }
    case 'cloudinary': {
      const cld = configureCloudinary();
      const res = await new Promise<any>((resolve, reject) => {
        const stream = cld.uploader.upload_stream(
          { public_id: idStr, resource_type: 'raw' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        Readable.from(data).pipe(stream);
      });
      id = res.public_id;
      break;
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  const finalId = `${provider}:${id}`;
  console.log(`[Cloud] Uploaded to ${provider}: ${finalId} (${data.length} bytes)`);
  return finalId;
}

export async function downloadShard(id: string): Promise<Buffer> {
  const [provider, realId] = id.split(':');
  
  if (failureSimulated.get(provider)) {
    throw new Error(`${provider}: Simulated failure`);
  }
  
  let data: Buffer;

  switch (provider) {
    case 'google_drive': {
      const drive = getDrive();
      const res = await drive.files.get(
        { fileId: realId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      data = Buffer.from(res.data as ArrayBuffer);
      break;
    }
    case 'dropbox': {
      const dbx = getDropbox();
      const res = await dbx.filesDownload({ path: realId.startsWith('/') ? realId : `/vault/${realId}` });
      // In Node environment fileBinary contains the buffer
      data = (res.result as any).fileBinary;
      break;
    }
    case 'cloudinary': {
      configureCloudinary();
      const url = cloudinary.url(realId, { resource_type: 'raw' });
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch from Cloudinary: ${res.statusText}`);
      const arrayBuffer = await res.arrayBuffer();
      data = Buffer.from(arrayBuffer);
      break;
    }
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
  
  console.log(`[Cloud] Downloaded: ${id}`);
  return data;
}

export async function deleteShard(id: string): Promise<boolean> {
  const [provider, realId] = id.split(':');
  
  if (failureSimulated.get(provider)) {
    throw new Error(`${provider}: Simulated failure`);
  }

  try {
    switch (provider) {
      case 'google_drive': {
        const drive = getDrive();
        await drive.files.delete({ fileId: realId });
        break;
      }
      case 'dropbox': {
        const dbx = getDropbox();
        await dbx.filesDeleteV2({ path: realId.startsWith('/') ? realId : `/vault/${realId}` });
        break;
      }
      case 'cloudinary': {
        const cld = configureCloudinary();
        await cld.uploader.destroy(realId, { resource_type: 'raw' });
        break;
      }
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
    console.log(`[Cloud] Deleted: ${id}`);
    return true;
  } catch (error) {
    console.error(`[Cloud] Complete delete failed for ${id}:`, error);
    return false;
  }
}

export function simulateFailure(provider: string, enable: boolean): void {
  failureSimulated.set(provider, enable);
  console.log(`[Cloud] ${provider} failure simulation: ${enable ? 'ON' : 'OFF'}`);
}

export function isFailureSimulated(provider: string): boolean {
  return failureSimulated.get(provider) || false;
}

export function getProviderStats(): { provider: string; status: string; shards: number; bytes: number }[] {
  // Since we cannot synchronously list components from remote without impacting perf,
  // returning dummy mock stats but keeping the provider failure states.
  return ['google_drive', 'dropbox', 'cloudinary'].map(provider => ({
    provider,
    status: failureSimulated.get(provider) ? 'error' : 'healthy',
    shards: 0,
    bytes: 0,
  }));
}
