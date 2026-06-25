import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { ChatMessage, UploadedDataset, ExportJob } from '../types';

let dynamodbClient: DynamoDBClient | null = null;

function getDynamoDBClient(): DynamoDBClient {
  if (!dynamodbClient) {
    const region = process.env.AWS_REGION || 'us-east-1';
    dynamodbClient = new DynamoDBClient({ region });
  }
  return dynamodbClient;
}

const CHAT_HISTORY_TABLE = 'data-analysis-chat-history';
const DATASETS_TABLE = 'data-analysis-datasets';
const EXPORTS_TABLE = 'data-analysis-exports';

// Chat History Operations

export async function saveChatMessage(message: ChatMessage): Promise<void> {
  const client = getDynamoDBClient();

  try {
    const command = new PutItemCommand({
      TableName: CHAT_HISTORY_TABLE,
      Item: {
        sessionId: { S: message.sessionId },
        timestamp: { N: Date.now().toString() },
        id: { S: message.id },
        type: { S: message.type },
        content: { S: message.content },
        ...(message.resultId && { resultId: { S: message.resultId } }),
      },
    });

    await client.send(command);
  } catch (error) {
    console.error('[v0] Error saving chat message:', error);
    throw error;
  }
}

export async function getChatHistory(
  sessionId: string,
  limit: number = 20
): Promise<ChatMessage[]> {
  const client = getDynamoDBClient();

  try {
    const command = new QueryCommand({
      TableName: CHAT_HISTORY_TABLE,
      KeyConditionExpression: 'sessionId = :sessionId',
      ExpressionAttributeValues: {
        ':sessionId': { S: sessionId },
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    });

    const result = await client.send(command);
    const items = result.Items || [];

    return items.map((item) => ({
      id: item.id?.S || '',
      sessionId: item.sessionId?.S || '',
      type: (item.type?.S as 'user' | 'assistant') || 'user',
      content: item.content?.S || '',
      resultId: item.resultId?.S,
      createdAt: new Date(parseInt(item.timestamp?.N || '0')),
    }));
  } catch (error) {
    console.error('[v0] Error fetching chat history:', error);
    throw error;
  }
}

// Dataset Operations

export async function saveDatasetMetadata(dataset: UploadedDataset): Promise<void> {
  const client = getDynamoDBClient();

  try {
    const command = new PutItemCommand({
      TableName: DATASETS_TABLE,
      Item: {
        datasetId: { S: dataset.datasetId },
        sessionId: { S: dataset.sessionId },
        fileName: { S: dataset.fileName },
        fileType: { S: dataset.fileType },
        tableId: { S: dataset.tableId },
        rowCount: { N: dataset.rowCount.toString() },
        columnCount: { N: dataset.columnCount.toString() },
        schema: { S: JSON.stringify(dataset.schema) },
        uploadedAt: { N: dataset.uploadedAt.getTime().toString() },
      },
    });

    await client.send(command);
  } catch (error) {
    console.error('[v0] Error saving dataset metadata:', error);
    throw error;
  }
}

export async function getDatasetMetadata(datasetId: string): Promise<UploadedDataset | null> {
  const client = getDynamoDBClient();

  try {
    const command = new GetItemCommand({
      TableName: DATASETS_TABLE,
      Key: {
        datasetId: { S: datasetId },
      },
    });

    const result = await client.send(command);
    const item = result.Item;

    if (!item) return null;

    return {
      datasetId: item.datasetId?.S || '',
      sessionId: item.sessionId?.S || '',
      fileName: item.fileName?.S || '',
      fileType: (item.fileType?.S as 'csv' | 'xlsx') || 'csv',
      tableId: item.tableId?.S || '',
      rowCount: parseInt(item.rowCount?.N || '0'),
      columnCount: parseInt(item.columnCount?.N || '0'),
      schema: JSON.parse(item.schema?.S || '[]'),
      uploadedAt: new Date(parseInt(item.uploadedAt?.N || '0')),
    };
  } catch (error) {
    console.error('[v0] Error fetching dataset metadata:', error);
    throw error;
  }
}

export async function getSessionDatasets(sessionId: string): Promise<UploadedDataset[]> {
  const client = getDynamoDBClient();

  try {
    const command = new QueryCommand({
      TableName: DATASETS_TABLE,
      IndexName: 'sessionId-uploadedAt-index', // Must exist in DynamoDB
      KeyConditionExpression: 'sessionId = :sessionId',
      ExpressionAttributeValues: {
        ':sessionId': { S: sessionId },
      },
      ScanIndexForward: false,
    });

    const result = await client.send(command);
    const items = result.Items || [];

    return items.map((item) => ({
      datasetId: item.datasetId?.S || '',
      sessionId: item.sessionId?.S || '',
      fileName: item.fileName?.S || '',
      fileType: (item.fileType?.S as 'csv' | 'xlsx') || 'csv',
      tableId: item.tableId?.S || '',
      rowCount: parseInt(item.rowCount?.N || '0'),
      columnCount: parseInt(item.columnCount?.N || '0'),
      schema: JSON.parse(item.schema?.S || '[]'),
      uploadedAt: new Date(parseInt(item.uploadedAt?.N || '0')),
    }));
  } catch (error) {
    console.error('[v0] Error fetching session datasets:', error);
    throw error;
  }
}

// Export Job Operations

export async function createExportJob(job: ExportJob): Promise<void> {
  const client = getDynamoDBClient();

  try {
    const command = new PutItemCommand({
      TableName: EXPORTS_TABLE,
      Item: {
        jobId: { S: job.jobId },
        resultId: { S: job.resultId },
        format: { S: job.format },
        status: { S: job.status },
        createdAt: { N: job.createdAt.getTime().toString() },
        ...(job.fileUrl && { fileUrl: { S: job.fileUrl } }),
        ...(job.email && { email: { S: job.email } }),
        ...(job.error && { error: { S: job.error } }),
      },
    });

    await client.send(command);
  } catch (error) {
    console.error('[v0] Error creating export job:', error);
    throw error;
  }
}

export async function updateExportJobStatus(
  jobId: string,
  status: ExportJob['status'],
  updates?: { fileUrl?: string; error?: string; completedAt?: Date }
): Promise<void> {
  const client = getDynamoDBClient();

  try {
    const updateExpressionParts = ['#status = :status'];
    const expressionAttributeNames: Record<string, string> = {
      '#status': 'status',
    };
    const expressionAttributeValues: Record<string, any> = {
      ':status': { S: status },
    };

    if (updates?.fileUrl) {
      updateExpressionParts.push('fileUrl = :fileUrl');
      expressionAttributeValues[':fileUrl'] = { S: updates.fileUrl };
    }

    if (updates?.error) {
      updateExpressionParts.push('error = :error');
      expressionAttributeValues[':error'] = { S: updates.error };
    }

    if (updates?.completedAt) {
      updateExpressionParts.push('completedAt = :completedAt');
      expressionAttributeValues[':completedAt'] = {
        N: updates.completedAt.getTime().toString(),
      };
    }

    const command = new UpdateItemCommand({
      TableName: EXPORTS_TABLE,
      Key: {
        jobId: { S: jobId },
      },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await client.send(command);
  } catch (error) {
    console.error('[v0] Error updating export job:', error);
    throw error;
  }
}
