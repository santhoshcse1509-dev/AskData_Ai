// Shared types for data analysis tool

export interface UploadSession {
  sessionId: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UploadedDataset {
  datasetId: string;
  sessionId: string;
  fileName: string;
  fileType: 'csv' | 'xlsx';
  tableId: string;
  rowCount?: number;
  columnCount?: number;
  schema?: ColumnSchema[];
  uploadedAt?: Date;
  rawData?: Record<string, any>[]; // Demo mode: store parsed data
}

export interface ColumnSchema {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  nullable: boolean;
  sampleValues?: string[];
}

export interface QueryResult {
  resultId: string;
  sessionId: string;
  datasetId: string;
  query: string;
  sqlQuery: string;
  rows: Record<string, any>[];
  rowCount: number;
  columns: string[];
  executionTime: number;
  isCached: boolean;
  summary: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  type: 'user' | 'assistant';
  content: string;
  resultId?: string;
  createdAt: Date;
}

export interface ExportJob {
  jobId: string;
  resultId: string;
  format: 'pdf' | 'excel' | 'csv' | 'word';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  email?: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface BedrockResponse {
  sqlQuery: string;
  explanation: string;
  confidence: number;
}

export interface S3UploadRequest {
  fileName: string;
  fileType: string;
}

export interface S3UploadResponse {
  uploadUrl: string;
  uploadId: string;
  expiresIn: number;
  s3Key: string;
}

export interface SuggestResponse {
  suggestions: string[];
}

export interface AnalyzeRequest {
  sessionId: string;
  datasetId: string;
  question: string;
  useCache?: boolean;
  rawData?: Record<string, any>[]; // Demo mode: raw parsed data
}

export interface AnalyzeResponse {
  resultId: string;
  rows: Record<string, any>[];
  columns: string[];
  rowCount: number;
  executionTime: number;
  sqlQuery: string;
  isCached: boolean;
  summary: string;
}

export interface ExportRequest {
  resultId: string;
  format: 'pdf' | 'excel' | 'csv' | 'word';
  email?: string;
}

export interface ExportResponse {
  jobId: string;
  status: 'completed' | 'queued';
  fileUrl?: string;
  message: string;
}
