// Types for the Secure Sharded Document Vault

export interface User {
  id: string;
  email: string;
  created_at: string;
  files_count: number;
  total_storage: number;
}

export interface AuthResponse {
  token: string;
  user: User;
  expires_in: number;
}

export interface FileInfo {
  file_id: string;
  file_name: string;
  file_size: number;
  status: 'healthy' | 'recovered' | 'degraded' | 'error';
  shards_count: number;
  created_at: string;
  upload_duration: number;
}

export interface FileDetails extends FileInfo {
  encrypted_size: number;
  cloud_ids: CloudIds;
  updated_at: string;
}

export interface CloudIds {
  shard_a?: { file_id: string; provider: string };
  shard_b?: { file_id: string; provider: string };
  parity?: { file_id: string; provider: string };
}

export interface Activity {
  activity_id: string;
  file_id: string;
  action: 'upload' | 'download' | 'delete' | 'recovery';
  status: 'success' | 'error';
  details: Record<string, unknown>;
  created_at: string;
}

export interface CloudProvider {
  name: string;
  display_name: string;
  health: 'healthy' | 'error';
  file_count: number;
  storage_used: number;
}

export interface UploadProgress {
  stage: 'encrypting' | 'sharding' | 'uploading' | 'complete' | 'error';
  progress: number;
  message: string;
}

export interface FileStats {
  total_files: number;
  total_size: number;
  status_counts: {
    healthy: number;
    recovered: number;
    degraded: number;
    error: number;
  };
}
