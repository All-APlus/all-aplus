'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  File as FileIcon,
  PlayCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Document } from '@/types/database';

const STATUS_MAP = {
  pending: { label: '대기 중', icon: Loader2, color: 'text-gray-400', spin: true },
  processing: { label: '처리 중', icon: Loader2, color: 'text-blue-500', spin: true },
  completed: { label: '완료', icon: CheckCircle, color: 'text-green-500', spin: false },
  failed: { label: '실패', icon: XCircle, color: 'text-red-500', spin: false },
} as const;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeLoading, setYoutubeLoading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    const res = await fetch(`/api/documents?courseId=${courseId}`);
    if (res.ok) {
      setDocuments(await res.json());
    }
  }, [courseId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // 처리 중인 문서가 있으면 폴링
  useEffect(() => {
    const hasProcessing = documents.some(
      (d) => d.status === 'pending' || d.status === 'processing',
    );
    if (!hasProcessing) return;

    const interval = setInterval(fetchDocuments, 3000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);
      setUploading(true);

      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('courseId', courseId);

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || '업로드 실패');
        }
      }

      setUploading(false);
      fetchDocuments();
    },
    [courseId, fetchDocuments],
  );

  const deleteDocument = async (docId: string) => {
    const res = await fetch(`/api/documents?id=${docId}`, { method: 'DELETE' });
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    }
  };

  const handleYouTube = async () => {
    if (!youtubeUrl.trim()) return;
    setError(null);
    setYoutubeLoading(true);

    try {
      const res = await fetch('/api/documents/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl.trim(), courseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'YouTube 자막 추출 실패');
      } else {
        setYoutubeUrl('');
        fetchDocuments();
      }
    } catch {
      setError('YouTube 처리 중 오류가 발생했습니다');
    } finally {
      setYoutubeLoading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxSize: 10 * 1024 * 1024,
    disabled: uploading,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">학습 자료</h2>
          <p className="text-sm text-muted-foreground mt-1">
            파일 업로드 또는 YouTube URL로 자료를 추가하면 AI가 내용을 기반으로 답변합니다
          </p>
        </div>
      </div>

      {/* 드롭존 */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors mb-6
          ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
          ) : (
            <Upload className="h-10 w-10 text-gray-400" />
          )}
          <p className="text-sm font-medium">
            {uploading
              ? '업로드 중...'
              : isDragActive
                ? '여기에 놓으세요'
                : '파일을 드래그하거나 클릭하여 업로드'}
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, DOCX, PPTX, TXT, MD (최대 10MB)
          </p>
        </div>
      </div>

      {/* YouTube URL 입력 */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-2 flex-1">
          <PlayCircle className="h-5 w-5 text-red-500 shrink-0" />
          <Input
            type="url"
            placeholder="YouTube URL을 붙여넣으세요 (자막 있는 영상)"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleYouTube()}
            disabled={youtubeLoading}
            className="flex-1"
          />
        </div>
        <Button
          onClick={handleYouTube}
          disabled={!youtubeUrl.trim() || youtubeLoading}
          size="sm"
        >
          {youtubeLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            '자막 추출'
          )}
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* 문서 목록 */}
      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold mb-1">아직 업로드된 자료가 없습니다</h3>
          <p className="text-sm text-muted-foreground">
            강의 자료를 업로드하면 AI가 내용을 분석합니다
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const status = STATUS_MAP[doc.status];
            const StatusIcon = status.icon;

            return (
              <Card key={doc.id}>
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileIcon className="h-5 w-5 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatSize(doc.file_size)}</span>
                        {doc.chunk_count > 0 && <span>{doc.chunk_count}개 청크</span>}
                        {doc.error_message && (
                          <span className="text-red-500 truncate max-w-[200px]">
                            {doc.error_message}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <div className="flex items-center gap-1">
                      <StatusIcon
                        className={`h-4 w-4 ${status.color} ${status.spin ? 'animate-spin' : ''}`}
                      />
                      <span className={`text-xs ${status.color}`}>{status.label}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDocument(doc.id)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
