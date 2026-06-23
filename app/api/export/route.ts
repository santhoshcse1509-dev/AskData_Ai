import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createExportJob, updateExportJobStatus } from '@/lib/aws/dynamodb';
import { ExportRequest, ExportResponse, ExportJob } from '@/lib/types';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { resultId, format, email }: ExportRequest = await req.json();

    // Validate input
    if (!resultId || !format) {
      return NextResponse.json(
        { error: 'Missing required fields: resultId, format' },
        { status: 400 }
      );
    }

    // Validate format
    const validFormats = ['pdf', 'excel', 'csv', 'word'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: 'Invalid export format' },
        { status: 400 }
      );
    }

    const jobId = uuidv4();
    const now = new Date();

    console.log(`[v0] Creating export job ${jobId} for result ${resultId}`);

    // Create export job in DynamoDB
    const job: ExportJob = {
      jobId,
      resultId,
      format: format as any,
      status: 'queued',
      email,
      createdAt: now,
    };

    await createExportJob(job);

    // For now, return queued status
    // In production, this would trigger a Lambda function for large datasets
    // or immediately process small datasets

    const response: ExportResponse = {
      jobId,
      status: 'queued',
      message:
        format === 'excel' || format === 'csv'
          ? 'Export job queued. You will receive an email with your file shortly.'
          : 'Export started. Your file will be ready shortly.',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[v0] Error in export endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to create export job' },
      { status: 500 }
    );
  }
}
