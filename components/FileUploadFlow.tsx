'use client';

import React, { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadedDataset, S3UploadResponse } from '@/lib/types';

interface FileUploadFlowProps {
  sessionId: string;
  onDatasetAdded: (dataset: UploadedDataset) => void;
}

export default function FileUploadFlow({ sessionId, onDatasetAdded }: FileUploadFlowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    
    if (!validTypes.includes(file.type)) {
      setUploadStatus('error');
      setStatusMessage('Please upload a CSV or Excel file');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      // Step 1: Get pre-signed URL
      const urlResponse = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
        }),
      });

      if (!urlResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const urlData: S3UploadResponse = await urlResponse.json();

      // Step 2: Upload to S3
      const uploadResponse = await fetch(urlData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to S3');
      }

      // Step 3: Create mock dataset (in production, Lambda would parse and create Aurora table)
      const mockDataset: UploadedDataset = {
        datasetId: urlData.uploadId,
        sessionId,
        fileName: file.name,
        fileType: file.name.endsWith('.xlsx') ? 'xlsx' : 'csv',
        tableId: urlData.uploadId.replace(/[^a-zA-Z0-9_]/g, '_'),
        rowCount: 0, // Would be populated by Lambda
        columnCount: 0,
        schema: [],
        uploadedAt: new Date(),
      };

      onDatasetAdded(mockDataset);

      setUploadStatus('success');
      setStatusMessage(`File "${file.name}" uploaded successfully!`);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('[v0] Upload error:', error);
      setUploadStatus('error');
      setStatusMessage(
        error instanceof Error ? error.message : 'An error occurred during upload'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFileSelect(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-accent bg-accent/10'
            : 'border-border hover:border-accent/50'
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div className={`p-3 rounded-full ${isDragging ? 'bg-accent/20' : 'bg-muted'}`}>
            <Upload className={`w-6 h-6 ${isDragging ? 'text-accent' : 'text-muted-foreground'}`} />
          </div>
          
          <div>
            <p className="text-lg font-semibold text-foreground">
              Drag and drop your file here
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse (CSV or Excel)
            </p>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="mt-4"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Select File
              </>
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

      {/* Status Message */}
      {uploadStatus !== 'idle' && (
        <div
          className={`p-4 rounded-lg border flex items-start gap-3 ${
            uploadStatus === 'success'
              ? 'bg-green-500/10 border-green-500/50 text-green-700'
              : 'bg-red-500/10 border-red-500/50 text-red-700'
          }`}
        >
          {uploadStatus === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <p>{statusMessage}</p>
        </div>
      )}

      {/* File Info */}
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
