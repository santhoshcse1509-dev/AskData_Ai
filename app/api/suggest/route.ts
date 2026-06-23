import { NextRequest, NextResponse } from 'next/server';
import { suggestColumnValues } from '@/lib/aws/opensearch';
import { SuggestResponse } from '@/lib/types';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { tableId, columnName, prefix } = await req.json();

    // Validate input
    if (!tableId || !columnName || prefix === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: tableId, columnName, prefix' },
        { status: 400 }
      );
    }

    // Prefix should be a string (can be empty)
    if (typeof prefix !== 'string') {
      return NextResponse.json(
        { error: 'prefix must be a string' },
        { status: 400 }
      );
    }

    console.log(
      `[v0] Fetching suggestions for ${tableId}.${columnName} with prefix: "${prefix}"`
    );

    // Get suggestions from OpenSearch
    const suggestions = await suggestColumnValues(tableId, columnName, prefix, 10);

    const response: SuggestResponse = {
      suggestions,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[v0] Error in suggest endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}
