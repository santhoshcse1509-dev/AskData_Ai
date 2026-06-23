import {
  OpenSearchServerlessClient,
  SearchCommand,
} from '@aws-sdk/client-opensearchserverless';

let opensearchClient: OpenSearchServerlessClient | null = null;

function getOpenSearchClient(): OpenSearchServerlessClient {
  if (!opensearchClient) {
    const region = process.env.AWS_REGION || 'us-east-1';
    opensearchClient = new OpenSearchServerlessClient({ region });
  }
  return opensearchClient;
}

const COLLECTION_NAME = 'data-analysis-values';

export async function suggestColumnValues(
  tableId: string,
  columnName: string,
  prefix: string,
  limit: number = 10
): Promise<string[]> {
  const client = getOpenSearchClient();

  try {
    // Build OpenSearch query for suggestions
    const query = {
      bool: {
        must: [
          {
            match: {
              table_id: tableId,
            },
          },
          {
            match: {
              column_name: columnName,
            },
          },
          {
            prefix: {
              value: prefix.toLowerCase(),
            },
          },
        ],
      },
    };

    const command = new SearchCommand({
      collectionName: COLLECTION_NAME,
      body: JSON.stringify({
        size: limit,
        query: query,
        _source: ['value'],
      }),
    });

    const result = await client.send(command);

    // Extract unique values from search results
    const suggestions = new Set<string>();
    const hits = (result as any).hits?.hits || [];

    for (const hit of hits) {
      const value = hit._source?.value;
      if (value) {
        suggestions.add(value);
      }
    }

    return Array.from(suggestions).slice(0, limit);
  } catch (error) {
    console.error('[v0] Error fetching suggestions from OpenSearch:', error);
    // Return empty array on error for graceful degradation
    return [];
  }
}

export async function indexColumnValues(
  tableId: string,
  columnName: string,
  values: string[]
): Promise<void> {
  const client = getOpenSearchClient();

  try {
    // Index batch of values for this column
    const documents = values.map((value, index) => ({
      id: `${tableId}_${columnName}_${index}`,
      table_id: tableId,
      column_name: columnName,
      value: value,
      value_lower: value.toLowerCase(),
    }));

    console.log(
      `[v0] Indexing ${documents.length} values for ${tableId}.${columnName}`
    );

    // Note: In production, you'd use bulk indexing API
    // This is a simplified version for the skeleton
  } catch (error) {
    console.error('[v0] Error indexing column values in OpenSearch:', error);
    throw error;
  }
}

export async function clearTableIndex(tableId: string): Promise<void> {
  try {
    console.log(`[v0] Clearing OpenSearch index for table: ${tableId}`);
    // In production, delete all documents with this table_id
  } catch (error) {
    console.error('[v0] Error clearing OpenSearch index:', error);
    throw error;
  }
}
