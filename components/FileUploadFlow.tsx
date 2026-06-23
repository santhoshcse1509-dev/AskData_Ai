'use client';

import React, { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadedDataset } from '@/lib/types';

interface FileUploadFlowProps {
  sessionId: string;
  onDatasetAdded: (dataset: UploadedDataset) => void;
}

export default function FileUploadFlow({ sessionId, onDatasetAdded }: FileUploadFlowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!validTypes.includes(file.type)) {
      setUploadStatus('error');
      setStatusMessage('Please upload a CSV or Excel file');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setUploadProgress(0);

    try {
      // Step 1: Get presigned URL from our API
      setStatusMessage('Preparing upload...');
      setUploadProgress(10);

      const urlResponse = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });

      if (!urlResponse.ok) {
        const err = await urlResponse.json();
        throw new Error(err.error || 'Failed to get upload URL');
      }

      const { uploadUrl, s3Key } = await urlResponse.json();
      setUploadProgress(30);

      // Step 2: Upload file directly to S3
      setStatusMessage('Uploading to S3...');
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3');
      }

      setUploadProgress(80);
      setStatusMessage('Processing file...');

      // Step 3: Create dataset record
      const datasetId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const dataset: UploadedDataset = {
        datasetId,
        sessionId,
        fileName: file.name,
        fileType: file.name.endsWith('.xlsx') || file.name.endsWith('.xls') ? 'xlsx' : 'csv',
        tableId: `table_${datasetId.replace(/[^a-zA-Z0-9_]/g, '_')}`,
        uploadedAt: new Date(),
        s3Key,
      };

      onDatasetAdded(dataset);
      setUploadProgress(100);
      setUploadStatus('success');
      setStatusMessage(`"${file.name}" uploaded successfully to S3!`);

      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragging ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`p-3 rounded-full ${isDragging ? 'bg-accent/20' : 'bg-muted'}`}>
            <Upload className={`w-6 h-6 ${isDragging ? 'text-accent' : 'text-muted-foreground'}`} />
          </div>

          <div>
            <p className="text-lg font-semibold text-foreground">Drag and drop your file here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse (CSV or Excel)</p>
          </div>

          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="mt-4">
            {isUploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" />Select File</>
            )}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
          />
        </div>
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{statusMessage}</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Message */}
      {uploadStatus !== 'idle' && !isUploading && (
        <div className={`p-4 rounded-lg border flex items-start gap-3 ${
          uploadStatus === 'success'
            ? 'bg-green-500/10 border-green-500/50 text-green-700'
            : 'bg-red-500/10 border-red-500/50 text-red-700'
        }`}>
          {uploadStatus === 'success'
            ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
          <p>{statusMessage}</p>
        </div>
      )}

      <div className="p-4 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground">
          <strong>Supported formats:</strong> CSV (.csv), Excel (.xlsx, .xls)
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          <strong>Upload process:</strong> Files are uploaded directly to S3 and parsed server-side for security.
        </p>
      </div>
    </div>
  );
}