import { NextRequest, NextResponse } from 'next/server';
import { S3UploadResponse } from '@/lib/types';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { fileName, fileType } = await req.json();

    // Validate input
    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'Missing fileName or fileType' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only CSV and Excel files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file name
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension || !['csv', 'xlsx', 'xls'].includes(extension)) {
      return NextResponse.json(
        { error: 'Invalid file extension' },
        { status: 400 }
      );
    }

    // Demo mode: Generate mock upload URL
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const s3Key = `uploads/${timestamp}-${randomStr}/${fileName}`;
    
    // In demo mode, we'll use a data URL or simulate the upload
    const uploadUrl = `data:${fileType};base64,`;

    const response: S3UploadResponse = {
      uploadUrl,
      uploadId: s3Key,
      expiresIn: 900, // 15 minutes
      s3Key,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[v0] Error in upload-url endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
