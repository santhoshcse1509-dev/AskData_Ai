import { NextRequest, NextResponse } from 'next/server';
import { generateUploadUrl } from '@/lib/aws/s3';
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

    const { uploadUrl, s3Key } = await generateUploadUrl(fileName, fileType);

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
