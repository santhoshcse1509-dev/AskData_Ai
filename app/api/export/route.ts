import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

import { createExportJob } from '@/lib/aws/dynamodb';
import { ExportRequest, ExportResponse, ExportJob } from '@/lib/types';

const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

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

    // Create export job
    const job: ExportJob = {
      jobId,
      resultId,
      format: format as any,
      status: 'queued',
      email,
      createdAt: now,
    };

    await createExportJob(job);

    // Send email if email address is provided
    if (email) {
      const command = new SendEmailCommand({
        Source: process.env.SES_FROM_EMAIL!,
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Subject: {
            Data: 'Your Export Request has been Received',
          },
          Body: {
            Text: {
              Data: `
Hello,

Your export request has been received successfully.

Export Format: ${format}
Job ID: ${jobId}

Your export is currently being processed.

Once completed, your download link will be available.

Thank you,
AskData AI Team
              `,
            },
          },
        },
      });

      await sesClient.send(command);

      console.log(`[v0] Export email sent to ${email}`);
    }

    const response: ExportResponse = {
      jobId,
      status: 'queued',
      message:
        format === 'excel' || format === 'csv'
          ? 'Export job queued. You will receive an email shortly.'
          : 'Export started successfully.',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[v0] Error in export endpoint:', error);

    return NextResponse.json(
      {
        error: 'Failed to create export job',
      },
      {
        status: 500,
      }
    );
  }
}