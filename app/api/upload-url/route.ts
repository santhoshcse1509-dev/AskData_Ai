import { NextRequest, NextResponse } from 'next/server';
import { S3UploadResponse } from '@/lib/types';
import { generateUploadUrl } from '@/lib/aws/s3';

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

    // Validate MIME type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        {
          error:
            'Invalid file type. Only CSV and Excel files are allowed.',
        },
        { status: 400 }
      );
    }

    // Validate file extension
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (!extension || !['csv', 'xlsx', 'xls'].includes(extension)) {
      return NextResponse.json(
        { error: 'Invalid file extension' },
        { status: 400 }
      );
    }

    // Generate a real S3 presigned upload URL
    const { uploadUrl, s3Key } = await generateUploadUrl(
      fileName,
      fileType
    );

    const response: S3UploadResponse = {
      uploadUrl,
      uploadId: s3Key,
      expiresIn: 900,
      s3Key,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[upload-url] Error generating upload URL:', error);

    return NextResponse.json(
      {
        error: 'Failed to generate upload URL',
      },
      {
        status: 500,
      }
    );
  }
}