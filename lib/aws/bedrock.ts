import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { ColumnSchema, BedrockResponse, ChatMessage } from '../types';

let bedrockClient: BedrockRuntimeClient | null = null;

function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    const region = process.env.AWS_REGION || 'us-east-1';
    bedrockClient = new BedrockRuntimeClient({ region });
  }
  return bedrockClient;
}

const MODEL_ID = 'anthropic.claude-3-sonnet-20240229-v1:0';

export async function generateSQLQuery(
  question: string,
  tableId: string,
  schema: ColumnSchema[],
  chatHistory: ChatMessage[] = []
): Promise<BedrockResponse> {
  const client = getBedrockClient();

  // Build schema description
  const schemaDescription = schema
    .map((col) => `- ${col.name}: ${col.type}${col.nullable ? ' (nullable)' : ''}`)
    .join('\n');

  // Build chat context from history
  const contextMessages = chatHistory
    .slice(-5) // Last 5 messages for context
    .map(
      (msg) => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    )
    .join('\n');

  const systemPrompt = `You are a SQL query generator. Your job is to convert natural language questions into SQL queries.

Table Name: ${tableId}
Schema:
${schemaDescription}

Rules:
1. Always generate valid PostgreSQL queries
2. Use double quotes for identifiers if needed
3. Preserve column names exactly as shown in schema
4. For text search, use ILIKE for case-insensitive matching
5. Return results as JSON with sqlQuery and explanation fields
6. Be defensive - add appropriate WHERE conditions and ORDER BY clauses
7. Limit results to 10,000 rows maximum for safety`;

  const userPrompt = `${contextMessages ? `Previous context:\n${contextMessages}\n\n` : ''}Convert this question to a SQL query: "${question}"

Respond ONLY with valid JSON in this format:
{
  "sqlQuery": "SELECT ...",
  "explanation": "Brief explanation of what this query does",
  "confidence": 0.95
}`;

  try {
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-06-01',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    const response = await client.send(command);
    const responseText = new TextDecoder().decode(response.body);

    // Parse Claude's response
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      // Claude might wrap response in content array
      parsedResponse = JSON.parse(responseText);
    }

    // Extract the text content from Claude's response format
    let textContent = '';
    if (parsedResponse.content && Array.isArray(parsedResponse.content)) {
      textContent = parsedResponse.content[0]?.text || '';
    } else if (parsedResponse.text) {
      textContent = parsedResponse.text;
    }

    // Parse the JSON response from Claude
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Bedrock response');
    }

    const result = JSON.parse(jsonMatch[0]) as BedrockResponse;

    // Validate the response
    if (!result.sqlQuery || !result.explanation) {
      throw new Error('Invalid Bedrock response format');
    }

    return result;
  } catch (error) {
    console.error('[v0] Error calling Bedrock:', error);
    throw error;
  }
}

export function validateSQLQuery(query: string): boolean {
  // Basic SQL injection prevention
  const dangerousPatterns = [
    /;\s*(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE)/i,
    /--\s*(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE)/i,
    /\/\*[\s\S]*?\*\//,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(query)) {
      return false;
    }
  }

  // Query should start with SELECT
  if (!/^\s*SELECT/i.test(query)) {
    return false;
  }

  return true;
}
