import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateSQLQuery, validateSQLQuery } from '@/lib/aws/bedrock';
import { executeQuery, getTableSchema } from '@/lib/aws/aurora';
import { getChatHistory, saveChatMessage } from '@/lib/aws/dynamodb';
import { getCachedResult, cacheResult, generateQueryHash } from '@/lib/aws/redis';
import { AnalyzeRequest, AnalyzeResponse, ChatMessage } from '@/lib/types';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { sessionId, datasetId, question, useCache = true }: AnalyzeRequest = await req.json();

    // Validate input
    if (!sessionId || !datasetId || !question) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, datasetId, question' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const resultId = uuidv4();

    try {
      // Step 1: Fetch table schema
      console.log('[v0] Fetching schema for table:', datasetId);
      const schema = await getTableSchema(datasetId);

      if (schema.length === 0) {
        return NextResponse.json(
          { error: 'Table schema not found or table is empty' },
          { status: 404 }
        );
      }

      // Step 2: Load chat history for context
      console.log('[v0] Loading chat history for session:', sessionId);
      const chatHistory = await getChatHistory(sessionId, 5);

      // Step 3: Generate SQL using Bedrock
      console.log('[v0] Generating SQL query with Bedrock');
      const bedrockResponse = await generateSQLQuery(
        question,
        datasetId,
        schema,
        chatHistory
      );

      const { sqlQuery, explanation } = bedrockResponse;

      // Validate SQL query for security
      if (!validateSQLQuery(sqlQuery)) {
        return NextResponse.json(
          { error: 'Generated SQL query failed security validation' },
          { status: 400 }
        );
      }

      // Step 4: Check Redis cache
      let rows: Record<string, any>[] = [];
      let isCached = false;
      const queryHash = generateQueryHash(sqlQuery);

      if (useCache) {
        console.log('[v0] Checking Redis cache for query hash:', queryHash);
        const cachedData = await getCachedResult(queryHash);
        if (cachedData) {
          rows = cachedData;
          isCached = true;
          console.log('[v0] Cache hit! Retrieved', rows.length, 'rows');
        }
      }

      // Step 5: Execute query if not cached
      if (!isCached) {
        console.log('[v0] Executing query on Aurora');
        rows = await executeQuery(sqlQuery);
        console.log('[v0] Query returned', rows.length, 'rows');

        // Cache the results
        await cacheResult(queryHash, rows, 86400); // 24 hour TTL
      }

      // Limit results to prevent overwhelming the UI
      const maxRows = 10000;
      if (rows.length > maxRows) {
        console.log(`[v0] Limiting results from ${rows.length} to ${maxRows} rows`);
        rows = rows.slice(0, maxRows);
      }

      // Step 6: Extract column names
      const columns =
        rows.length > 0
          ? Object.keys(rows[0]).filter((key) => key !== 'id' && key !== 'created_at')
          : schema.map((col) => col.name);

      const executionTime = Date.now() - startTime;

      // Step 7: Save chat messages
      const userMessage: ChatMessage = {
        id: uuidv4(),
        sessionId,
        type: 'user',
        content: question,
        resultId,
        createdAt: new Date(),
      };

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        sessionId,
        type: 'assistant',
        content: explanation,
        resultId,
        createdAt: new Date(),
      };

      await Promise.all([
        saveChatMessage(userMessage),
        saveChatMessage(assistantMessage),
      ]);

      const response: AnalyzeResponse = {
        resultId,
        rows,
        columns,
        rowCount: rows.length,
        executionTime,
        sqlQuery,
        isCached,
        summary: explanation,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('[v0] Error in analyze endpoint:', error);
      
      // Save error to chat history
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        sessionId,
        type: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        createdAt: new Date(),
      };

      await saveChatMessage(errorMessage);

      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to analyze query' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[v0] Unexpected error in analyze endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
