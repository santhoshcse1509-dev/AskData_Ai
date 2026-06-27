import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { createExportJob } from '@/lib/aws/dynamodb';
import { ExportRequest, ExportResponse, ExportJob } from '@/lib/types';

 const sqs = new SQSClient({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { resultId, format, email }: ExportRequest = await req.json();

    if (!resultId || !format) {
      return NextResponse.json(
        { error: 'Missing required fields: resultId, format' },
        { status: 400 }
      );
    }

    const validFormats = ['pdf', 'excel', 'csv', 'word'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: 'Invalid export format' },
        { status: 400 }
      );
    }

    const jobId = uuidv4();
    const now = new Date();

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

    // Send job to SQS queue
    await sqs.send(new SendMessageCommand({
      QueueUrl: process.env.SQS_QUEUE_URL!,
      MessageBody: JSON.stringify({
        jobId,
        resultId,
        format,
        email,
        createdAt: now.toISOString(),
      }),
      MessageGroupId: 'exports',
    }));

    console.log(`[v0] Export job ${jobId} queued in SQS`);

    const response: ExportResponse = {
      jobId,
      status: 'queued',
      message: 'Export job queued. You will receive an email with your file shortly.',
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