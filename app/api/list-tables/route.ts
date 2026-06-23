import { NextRequest, NextResponse } from 'next/server';
import { getSessionDatasets } from '@/lib/aws/dynamodb';
import { UploadedDataset } from '@/lib/types';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { sessionId } = await req.json();

    // Validate input
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    console.log('[v0] Fetching datasets for session:', sessionId);

    // Get all datasets for this session
    const datasets = await getSessionDatasets(sessionId);

    return NextResponse.json({
      datasets,
      count: datasets.length,
    });
  } catch (error) {
    console.error('[v0] Error in list-tables endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table list' },
      { status: 500 }
    );
  }
}
