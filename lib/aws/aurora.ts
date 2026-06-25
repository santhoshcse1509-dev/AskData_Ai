import {
  RDSDataClient,
  ExecuteStatementCommand,
  ExecuteStatementCommandInput,
} from '@aws-sdk/client-rds-data';
import { getSecrets } from './secrets';
import { ColumnSchema } from '../types';

let auroraClient: RDSDataClient | null = null;

function getAuroraClient(): RDSDataClient {
  if (!auroraClient) {
    const region = process.env.AWS_REGION || 'us-east-1';
    auroraClient = new RDSDataClient({ region });
  }
  return auroraClient;
}

export async function getTableSchema(tableId: string): Promise<ColumnSchema[]> {
  const secrets = await getSecrets();
  const client = getAuroraClient();

  try {
    const command = new ExecuteStatementCommand({
      resourceArn: `arn:aws:rds:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:cluster:${secrets.auroraHost}`,
      secretArn: process.env.AURORA_SECRET_ARN || '',
      database: secrets.auroraDatabaseName,
      sql: `
        SELECT 
          column_name,
          data_type,
          is_nullable
        FROM 
          information_schema.columns
        WHERE 
          table_name = :tableId
        ORDER BY 
          ordinal_position
      `,
      parameters: [{ name: 'tableId', value: { stringValue: tableId } }],
    });

    const result = await client.send(command);
    const records = result.records || [];

    return records.map((record) => ({
      name: record[0]?.stringValue || '',
      type: inferColumnType(record[1]?.stringValue || ''),
      nullable: record[2]?.stringValue === 'YES',
    }));
  } catch (error) {
    console.error('[v0] Error fetching table schema:', error);
    throw error;
  }
}

export async function executeQuery(
  query: string,
  parameters?: Array<{ name: string; value: string }>
): Promise<Record<string, any>[]> {
  const secrets = await getSecrets();
  const client = getAuroraClient();

  try {
    const commandInput: ExecuteStatementCommandInput = {
      resourceArn: `arn:aws:rds:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:cluster:${secrets.auroraHost}`,
      secretArn: process.env.AURORA_SECRET_ARN || '',
      database: secrets.auroraDatabaseName,
      sql: query,
    };

    if (parameters && parameters.length > 0) {
      commandInput.parameters = parameters.map((p) => ({
        name: p.name,
        value: { stringValue: p.value },
      }));
    }

    const command = new ExecuteStatementCommand(commandInput);
    const result = await client.send(command);

    // Convert RDS result format to standard objects
    const columnMetadata = result.columnMetadata || [];
    const records = result.records || [];

    return records.map((record) => {
      const row: Record<string, any> = {};
      columnMetadata.forEach((col, index) => {
        const value = record[index];
        const colName = col.name || `col_${index}`;

        if (value?.stringValue !== undefined) {
          row[colName] = value.stringValue;
        } else if (value?.longValue !== undefined) {
          row[colName] = value.longValue;
        } else if (value?.doubleValue !== undefined) {
          row[colName] = value.doubleValue;
        } else if (value?.booleanValue !== undefined) {
          row[colName] = value.booleanValue;
        } else {
          row[colName] = null;
        }
      });
      return row;
    });
  } catch (error) {
    console.error('[v0] Error executing Aurora query:', error);
    throw error;
  }
}

export async function createTableFromData(
  tableId: string,
  schema: ColumnSchema[]
): Promise<void> {
  const secrets = await getSecrets();
  const client = getAuroraClient();

  const columnDefs = schema
    .map((col) => {
      const typeName = mapToSQLType(col.type);
      const nullStr = col.nullable ? '' : 'NOT NULL';
      return `${col.name} ${typeName} ${nullStr}`.trim();
    })
    .join(', ');

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS ${tableId} (
      id SERIAL PRIMARY KEY,
      ${columnDefs},
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  try {
    const command = new ExecuteStatementCommand({
      resourceArn: `arn:aws:rds:${process.env.AWS_REGION}:${process.env.AWS_ACCOUNT_ID}:cluster:${secrets.auroraHost}`,
      secretArn: process.env.AURORA_SECRET_ARN || '',
      database: secrets.auroraDatabaseName,
      sql: createTableSQL,
    });

    await client.send(command);
    console.log(`[v0] Created table: ${tableId}`);
  } catch (error) {
    console.error('[v0] Error creating Aurora table:', error);
    throw error;
  }
}

function inferColumnType(sqlType: string): ColumnSchema['type'] {
  const lowerType = sqlType.toLowerCase();
  if (lowerType.includes('char') || lowerType.includes('text')) {
    return 'string';
  } else if (
    lowerType.includes('int') ||
    lowerType.includes('float') ||
    lowerType.includes('decimal') ||
    lowerType.includes('numeric')
  ) {
    return 'number';
  } else if (lowerType.includes('date') || lowerType.includes('time')) {
    return 'date';
  } else if (lowerType.includes('bool')) {
    return 'boolean';
  }
  return 'string';
}

function mapToSQLType(colType: ColumnSchema['type']): string {
  switch (colType) {
    case 'string':
      return 'VARCHAR(255)';
    case 'number':
      return 'DECIMAL(18,4)';
    case 'date':
      return 'TIMESTAMP';
    case 'boolean':
      return 'BOOLEAN';
    default:
      return 'VARCHAR(255)';
  }
}
