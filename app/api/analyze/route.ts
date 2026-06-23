import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { AnalyzeRequest, AnalyzeResponse, ChatMessage } from '@/lib/types';

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { sessionId, datasetId, question, useCache = true, rawData }: AnalyzeRequest = await req.json();

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
      // Demo mode: Generate results based on question and raw data if available
      console.log('[v0] Processing question in demo mode:', question);
      
      // Simulate AI-generated SQL
      const mockSqlQuery = `SELECT * FROM ${datasetId} WHERE 1=1`;
      const explanation = `This query retrieves data matching your question: "${question}"`;

      // Generate mock data based on common questions
      let rows: Record<string, any>[] = [];
      
      // If raw data provided, filter it based on question keywords
      if (rawData && rawData.length > 0) {
        const lowerQuestion = question.toLowerCase();
        
        // Simple filtering based on keywords in the question
        if (lowerQuestion.includes('top') || lowerQuestion.includes('highest') || lowerQuestion.includes('max')) {
          // Sort by numeric columns in descending order
          const numericCols = Object.keys(rawData[0]).filter(k => !isNaN(rawData[0][k]));
          if (numericCols.length > 0) {
            rows = [...rawData].sort((a, b) => b[numericCols[0]] - a[numericCols[0]]).slice(0, 5);
          } else {
            rows = rawData.slice(0, 5);
          }
        } else if (lowerQuestion.includes('count') || lowerQuestion.includes('total')) {
          // Return count summary
          rows = [{ metric: 'Total Rows', value: rawData.length }];
        } else if (lowerQuestion.includes('average') || lowerQuestion.includes('mean')) {
          // Calculate averages for numeric columns
          const numericCols = Object.keys(rawData[0]).filter(k => !isNaN(rawData[0][k]));
          if (numericCols.length > 0) {
            const avg = numericCols.map(col => ({
              column: col,
              average: (rawData.reduce((sum, r) => sum + parseFloat(r[col] || 0), 0) / rawData.length).toFixed(2),
            }));
            rows = avg;
          } else {
            rows = rawData;
          }
        } else {
          // Return first 10 rows by default
          rows = rawData.slice(0, 10);
        }
      } else {
      
      if (question.toLowerCase().includes('top') || question.toLowerCase().includes('highest')) {
        rows = [
          { id: 1, name: 'Record A', value: 950, category: 'Category 1', date: '2024-01-15' },
          { id: 2, name: 'Record B', value: 880, category: 'Category 2', date: '2024-01-14' },
          { id: 3, name: 'Record C', value: 750, category: 'Category 1', date: '2024-01-13' },
          { id: 4, name: 'Record D', value: 620, category: 'Category 3', date: '2024-01-12' },
          { id: 5, name: 'Record E', value: 580, category: 'Category 2', date: '2024-01-11' },
        ];
      } else if (question.toLowerCase().includes('average') || question.toLowerCase().includes('mean')) {
        rows = [
          { category: 'Category 1', average_value: 723.5, count: 8 },
          { category: 'Category 2', average_value: 645.3, count: 12 },
          { category: 'Category 3', average_value: 582.1, count: 6 },
        ];
      } else if (question.toLowerCase().includes('count') || question.toLowerCase().includes('total')) {
        rows = [
          { metric: 'Total Records', value: 126, category: 'Overall' },
          { metric: 'Category 1', value: 45, category: 'Breakdown' },
          { metric: 'Category 2', value: 52, category: 'Breakdown' },
          { metric: 'Category 3', value: 29, category: 'Breakdown' },
        ];
      } else {
        rows = [
          { id: 1, name: 'Sample 1', value: 500, category: 'Type A', status: 'Active' },
          { id: 2, name: 'Sample 2', value: 450, category: 'Type B', status: 'Active' },
          { id: 3, name: 'Sample 3', value: 600, category: 'Type A', status: 'Inactive' },
          { id: 4, name: 'Sample 4', value: 550, category: 'Type C', status: 'Active' },
          { id: 5, name: 'Sample 5', value: 480, category: 'Type B', status: 'Active' },
          { id: 6, name: 'Sample 6', value: 520, category: 'Type A', status: 'Active' },
          { id: 7, name: 'Sample 7', value: 410, category: 'Type C', status: 'Inactive' },
          { id: 8, name: 'Sample 8', value: 580, category: 'Type B', status: 'Active' },
        ];
      }
      } // Close else from if (rawData && rawData.length > 0)

      // Extract columns from mock data
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      const executionTime = Date.now() - startTime;

      // Step 7: Save chat messages (in demo, just log)
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

      // Demo mode: Skip saving chat history
      console.log('[v0] Demo mode - skipping chat history save');

      const response: AnalyzeResponse = {
        resultId,
        rows,
        columns,
        rowCount: rows.length,
        executionTime,
        sqlQuery: mockSqlQuery,
        isCached: false,
        summary: explanation,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('[v0] Error in analyze endpoint:', error);
      
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
