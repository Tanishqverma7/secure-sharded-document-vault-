'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Upload,
  Download,
  Trash2,
  FileText,
  Activity,
  Cloud,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  LogOut,
  User,
  Server,
  HardDrive,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import { authApi, filesApi, cloudApi, activityApi, getAuthToken } from '@/services/api';
import type { User, FileInfo, Activity, CloudProvider, FileStats, UploadProgress } from '@/types';

// Format file size
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format date
function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString();
}

// Status badge colors
function getStatusBadge(status: string) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    healthy: { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
    recovered: { variant: 'secondary', icon: <RefreshCw className="h-3 w-3 mr-1" /> },
    degraded: { variant: 'outline', icon: <AlertTriangle className="h-3 w-3 mr-1" /> },
    error: { variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" /> },
  };
  return variants[status] || variants.error;
}

export default function VaultApp() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // View state
  const [activeTab, setActiveTab] = useState('dashboard');

  // Files state
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [fileStats, setFileStats] = useState<FileStats | null>(null);
  const [filesLoading, setFilesLoading] = useState(false);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPassword, setUploadPassword] = useState('');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Download state
  const [downloadDialog, setDownloadDialog] = useState<{ open: boolean; file: FileInfo | null }>({
    open: false,
    file: null,
  });
  const [downloadPassword, setDownloadPassword] = useState('');
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Cloud state
  const [cloudProviders, setCloudProviders] = useState<CloudProvider[]>([]);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [failureSimDialog, setFailureSimDialog] = useState<{ open: boolean; provider: string }>({
    open: false,
    provider: '',
  });

  // Activity state
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      authApi.verify().then((result) => {
        if (result.success && result.data) {
          setUser({
            id: result.data.id,
            email: result.data.email,
            created_at: '',
            files_count: result.data.files_count,
            total_storage: result.data.total_storage,
          });
          loadData();
        } else {
          authApi.logout();
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  // Load all data
  const loadData = useCallback(async () => {
    setFilesLoading(true);
    setActivityLoading(true);
    setCloudLoading(true);

    const [filesResult, statsResult, activityResult, cloudResult] = await Promise.all([
      filesApi.list(),
      filesApi.getStats(),
      activityApi.list(20),
      cloudApi.getStatus(),
    ]);

    if (filesResult.success && filesResult.data) {
      setFiles(filesResult.data);
    }
    if (statsResult.success && statsResult.data) {
      setFileStats(statsResult.data);
    }
    if (activityResult.success && activityResult.data) {
      setActivities(activityResult.data);
    }
    if (cloudResult.success && cloudResult.data) {
      setCloudProviders(cloudResult.data.providers);
    }

    setFilesLoading(false);
    setActivityLoading(false);
    setCloudLoading(false);
  }, []);

  // Auth handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const result =
      authMode === 'login' ? await authApi.login(email, password) : await authApi.register(email, password);

    if (result.success) {
      const profileResult = await authApi.getProfile();
      if (profileResult.success && profileResult.data) {
        setUser({
          id: profileResult.data.id,
          email: profileResult.data.email,
          created_at: '',
          files_count: profileResult.data.files_count,
          total_storage: profileResult.data.total_storage,
        });
      }
      loadData();
    } else {
      setAuthError(result.error || 'Authentication failed');
    }

    setAuthLoading(false);
  };

  const handleLogout = () => {
    authApi.logout();
    setUser(null);
    setFiles([]);
    setActivities([]);
    setFileStats(null);
  };

  // Upload handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadPassword) return;

    setUploadLoading(true);
    setUploadProgress({ stage: 'encrypting', progress: 0, message: 'Reading file...' });

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string)?.split(',')[1];

        setUploadProgress({ stage: 'sharding', progress: 30, message: 'Encrypting and sharding...' });

        const result = await filesApi.upload(
          uploadFile.name,
          base64,
          uploadFile.size,
          uploadPassword,
          (progress) => setUploadProgress(progress)
        );

        if (result.success) {
          setUploadProgress({ stage: 'complete', progress: 100, message: 'Upload complete!' });
          setUploadFile(null);
          setUploadPassword('');
          loadData();
          setTimeout(() => setUploadProgress(null), 3000);
        } else {
          setUploadProgress({ stage: 'error', progress: 0, message: result.error || 'Upload failed' });
        }

        setUploadLoading(false);
      };

      reader.readAsDataURL(uploadFile);
    } catch (error) {
      setUploadProgress({ stage: 'error', progress: 0, message: 'Failed to read file' });
      setUploadLoading(false);
    }
  };

  // Download handler
  const handleDownload = async () => {
    if (!downloadDialog.file || !downloadPassword) return;

    setDownloadLoading(true);

    const result = await filesApi.download(downloadDialog.file.file_id, downloadPassword);

    if (result.success && result.data) {
      // Create download link
      const link = document.createElement('a');
      link.href = `data:application/octet-stream;base64,${result.data.file_data}`;
      link.download = result.data.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadDialog({ open: false, file: null });
      setDownloadPassword('');
      loadData();
    } else {
      alert(result.error || 'Download failed');
    }

    setDownloadLoading(false);
  };

  // Delete handler
  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    const result = await filesApi.delete(fileId);
    if (result.success) {
      loadData();
    } else {
      alert(result.error || 'Delete failed');
    }
  };

  // Failure simulation
  const handleSimulateFailure = async (provider: string, enable: boolean) => {
    const result = await cloudApi.simulateFailure(provider, enable);
    if (result.success) {
      loadData();
    }
    setFailureSimDialog({ open: false, provider: '' });
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <Shield className="h-16 w-16 text-emerald-500 mx-auto mb-4 animate-pulse" />
          <p className="text-slate-400">Loading Secure Vault...</p>
        </div>
      </div>
    );
  }

  // Auth screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-emerald-500/10 rounded-full w-fit">
              <Shield className="h-10 w-10 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl text-white">Secure Document Vault</CardTitle>
            <CardDescription className="text-slate-400">
              Zero-knowledge, multi-cloud storage with self-healing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2 bg-slate-900">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-slate-900 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-slate-900 border-slate-700 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  {authError && (
                    <Alert variant="destructive">
                      <AlertDescription>{authError}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={authLoading}>
                    {authLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                    Login
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-4">
                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-slate-900 border-slate-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="bg-slate-900 border-slate-700 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  {authError && (
                    <Alert variant="destructive">
                      <AlertDescription>{authError}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={authLoading}>
                    {authLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-6 border-t border-slate-700">
              <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
                <div>
                  <Shield className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                  AES-256
                </div>
                <div>
                  <HardDrive className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                  RAID-5
                </div>
                <div>
                  <Cloud className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                  Multi-Cloud
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-emerald-500" />
            <div>
              <h1 className="text-xl font-bold text-white">Secure Vault</h1>
              <p className="text-xs text-slate-400">Zero-Knowledge Storage</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-white flex items-center gap-2">
                <User className="h-4 w-4" />
                {user.email}
              </p>
              <p className="text-xs text-slate-400">
                {fileStats?.total_files || 0} files • {formatSize(fileStats?.total_size || 0)}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-white">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Files
            </TabsTrigger>
            <TabsTrigger value="cloud" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Cloud Status
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardDescription>Total Files</CardDescription>
                  <CardTitle className="text-3xl text-emerald-500">{fileStats?.total_files || 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardDescription>Total Storage</CardDescription>
                  <CardTitle className="text-3xl text-emerald-500">{formatSize(fileStats?.total_size || 0)}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardDescription>Healthy Files</CardDescription>
                  <CardTitle className="text-3xl text-emerald-500">{fileStats?.status_counts.healthy || 0}</CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardDescription>Recovered</CardDescription>
                  <CardTitle className="text-3xl text-emerald-500">{fileStats?.status_counts.recovered || 0}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-500" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {activityLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                      </div>
                    ) : activities.length === 0 ? (
                      <p className="text-center text-slate-400 py-8">No activity yet</p>
                    ) : (
                      <div className="space-y-2">
                        {activities.map((activity, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {activity.action === 'upload' && <Upload className="h-4 w-4 text-emerald-500" />}
                              {activity.action === 'download' && <Download className="h-4 w-4 text-blue-500" />}
                              {activity.action === 'delete' && <Trash2 className="h-4 w-4 text-red-500" />}
                              <div>
                                <p className="text-sm text-white capitalize">{activity.action}</p>
                                <p className="text-xs text-slate-400">
                                  {activity.details?.file_name as string || 'Unknown file'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={activity.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                                {activity.status}
                              </Badge>
                              <p className="text-xs text-slate-500 mt-1">{formatDate(activity.created_at)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-emerald-500" />
                    Cloud Providers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cloudProviders.map((provider) => (
                      <div
                        key={provider.name}
                        className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Server className="h-5 w-5 text-emerald-500" />
                          <div>
                            <p className="text-sm text-white">{provider.display_name}</p>
                            <p className="text-xs text-slate-400">
                              {provider.file_count} files • {formatSize(provider.storage_used)}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={provider.health === 'healthy' ? 'default' : 'destructive'}
                          className="capitalize"
                        >
                          {provider.health}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card className="bg-slate-800/50 border-slate-700 max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-emerald-500" />
                  Upload File
                </CardTitle>
                <CardDescription>
                  Files are encrypted client-side with AES-256, then split into shards for multi-cloud storage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-600 hover:border-slate-500'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-slate-500" />
                  <p className="text-slate-300 mb-2">Drag and drop your file here</p>
                  <p className="text-slate-500 text-sm mb-4">or</p>
                  <Label htmlFor="file-input">
                    <Button variant="outline" className="cursor-pointer" asChild>
                      <span>Browse Files</span>
                    </Button>
                  </Label>
                  <Input
                    id="file-input"
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>

                {/* Selected File */}
                {uploadFile && (
                  <div className="p-4 bg-slate-900/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-emerald-500" />
                        <div>
                          <p className="text-white font-medium">{uploadFile.name}</p>
                          <p className="text-slate-400 text-sm">{formatSize(uploadFile.size)}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUploadFile(null)}
                        className="text-slate-400"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Encryption Password */}
                {uploadFile && (
                  <div className="space-y-2">
                    <Label htmlFor="upload-password">Encryption Password</Label>
                    <div className="relative">
                      <Input
                        id="upload-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter encryption password"
                        value={uploadPassword}
                        onChange={(e) => setUploadPassword(e.target.value)}
                        className="bg-slate-900 border-slate-700 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                      This password is used to derive your AES-256 encryption key. Never share it.
                    </p>
                  </div>
                )}

                {/* Progress */}
                {uploadProgress && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 capitalize">{uploadProgress.stage}</span>
                      <span className="text-emerald-500">{uploadProgress.progress}%</span>
                    </div>
                    <Progress value={uploadProgress.progress} className="h-2" />
                    <p className="text-xs text-slate-500">{uploadProgress.message}</p>
                  </div>
                )}

                {/* Upload Button */}
                {uploadFile && (
                  <Button
                    onClick={handleUpload}
                    disabled={!uploadPassword || uploadLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    {uploadLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Lock className="h-4 w-4 mr-2" />
                    )}
                    Encrypt & Upload
                  </Button>
                )}

                {/* Info */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700">
                  <div className="text-center">
                    <Shield className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                    <p className="text-xs text-slate-400">AES-256 Encryption</p>
                  </div>
                  <div className="text-center">
                    <HardDrive className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                    <p className="text-xs text-slate-400">RAID-5 Sharding</p>
                  </div>
                  <div className="text-center">
                    <Cloud className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                    <p className="text-xs text-slate-400">Multi-Cloud Storage</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-500" />
                    Your Files
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={loadData} disabled={filesLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${filesLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {filesLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                  </div>
                ) : files.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-slate-600" />
                    <p className="text-slate-400">No files uploaded yet</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setActiveTab('upload')}
                    >
                      Upload your first file
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {files.map((file) => {
                        const statusBadge = getStatusBadge(file.status);
                        return (
                          <div
                            key={file.file_id}
                            className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg hover:bg-slate-900/70 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <FileText className="h-8 w-8 text-emerald-500" />
                              <div>
                                <p className="text-white font-medium">{file.file_name}</p>
                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                  <span>{formatSize(file.file_size)}</span>
                                  <span>•</span>
                                  <span>{file.shards_count}/3 shards</span>
                                  <span>•</span>
                                  <span>{formatDate(file.created_at)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={statusBadge.variant} className="flex items-center">
                                {statusBadge.icon}
                                {file.status}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDownloadDialog({ open: true, file })}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(file.file_id)}
                                className="text-red-500 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cloud Status Tab */}
          <TabsContent value="cloud">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Provider Status */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-emerald-500" />
                    Cloud Providers
                  </CardTitle>
                  <CardDescription>
                    Shard distribution across cloud providers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {cloudProviders.map((provider) => (
                      <div
                        key={provider.name}
                        className="p-4 bg-slate-900/50 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Server className="h-6 w-6 text-emerald-500" />
                            <div>
                              <p className="text-white font-medium">{provider.display_name}</p>
                              <p className="text-xs text-slate-400">
                                {provider.name === 'google_drive' && 'Shard A Storage'}
                                {provider.name === 'dropbox' && 'Shard B Storage'}
                                {provider.name === 'cloudinary' && 'Parity Shard Storage'}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={provider.health === 'healthy' ? 'default' : 'destructive'}
                          >
                            {provider.health}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">
                            {provider.file_count} files stored
                          </span>
                          <span className="text-slate-400">
                            {formatSize(provider.storage_used)}
                          </span>
                        </div>
                        <Separator className="my-3 bg-slate-700" />
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setFailureSimDialog({ open: true, provider: provider.name })}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Simulate Failure
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Shard Architecture */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-emerald-500" />
                    RAID-5 Architecture
                  </CardTitle>
                  <CardDescription>
                    Fault-tolerant storage with XOR parity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-emerald-500/20 rounded">
                          <Shield className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Shard A</p>
                          <p className="text-xs text-slate-400">First half of encrypted data</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">Stored on: Google Drive</p>
                    </div>

                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-emerald-500/20 rounded">
                          <Shield className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Shard B</p>
                          <p className="text-xs text-slate-400">Second half of encrypted data</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">Stored on: Dropbox</p>
                    </div>

                    <div className="p-4 bg-slate-900/50 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-amber-500/20 rounded">
                          <Zap className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Parity Shard</p>
                          <p className="text-xs text-slate-400">A XOR B - enables recovery</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">Stored on: Cloudinary</p>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <h4 className="text-emerald-500 font-medium mb-2">Recovery Logic</h4>
                    <ul className="text-xs text-slate-400 space-y-1">
                      <li>• Any 2 shards can reconstruct the original file</li>
                      <li>• Shard A = Parity XOR Shard B</li>
                      <li>• Shard B = Parity XOR Shard A</li>
                      <li>• Parity = Shard A XOR Shard B</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Download Dialog */}
      <Dialog open={downloadDialog.open} onOpenChange={(open) => setDownloadDialog({ open, file: downloadDialog.file })}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-emerald-500" />
              Download File
            </DialogTitle>
            <DialogDescription>
              Enter your encryption password to decrypt and download the file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {downloadDialog.file && (
              <div className="p-3 bg-slate-900/50 rounded-lg flex items-center gap-3">
                <FileText className="h-8 w-8 text-emerald-500" />
                <div>
                  <p className="text-white">{downloadDialog.file.file_name}</p>
                  <p className="text-xs text-slate-400">{formatSize(downloadDialog.file.file_size)}</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="download-password">Encryption Password</Label>
              <Input
                id="download-password"
                type="password"
                placeholder="Enter encryption password"
                value={downloadPassword}
                onChange={(e) => setDownloadPassword(e.target.value)}
                className="bg-slate-900 border-slate-700"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDownloadDialog({ open: false, file: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleDownload}
              disabled={!downloadPassword || downloadLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {downloadLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Unlock className="h-4 w-4 mr-2" />
              )}
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Failure Simulation Dialog */}
      <Dialog open={failureSimDialog.open} onOpenChange={(open) => setFailureSimDialog({ open, provider: failureSimDialog.provider })}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Simulate Cloud Failure
            </DialogTitle>
            <DialogDescription>
              This will simulate a failure for testing the self-healing recovery system
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert className="bg-amber-500/10 border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-200">
                Simulating failure will make this provider unavailable for downloads. Files can still be recovered from other shards.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFailureSimDialog({ open: false, provider: '' })}>
              Cancel
            </Button>
            <Button
              onClick={() => handleSimulateFailure(failureSimDialog.provider, true)}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              Simulate Failure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 mt-auto">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-500" />
            <span>Secure Document Vault v1.0</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" /> AES-256
            </span>
            <span className="flex items-center gap-1">
              <HardDrive className="h-3 w-3" /> RAID-5
            </span>
            <span className="flex items-center gap-1">
              <Cloud className="h-3 w-3" /> Multi-Cloud
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
