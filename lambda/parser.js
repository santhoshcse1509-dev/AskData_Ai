const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { RDSDataClient, ExecuteStatementCommand } = require('@aws-sdk/client-rds-data');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { parse } = require('csv-parse/sync');
const xlsx = require('xlsx');
const { v4: uuidv4 } = require('uuid');

const s3 = new S3Client({ region: process.env.AWS_REGION });
const rds = new RDSDataClient({ region: process.env.AWS_REGION });
const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });

exports.handler = async (event) => {
  const record = event.Records[0];
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

  console.log(`Processing file: ${key} from bucket: ${bucket}`);

  try {
    // 1. Download file from S3
    const s3Response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const fileBuffer = Buffer.from(await s3Response.Body.transformToByteArray());

    // 2. Parse file
    const fileName = key.split('/').pop();
    const extension = fileName.split('.').pop().toLowerCase();
    let rows = [];
    let headers = [];

    if (extension === 'csv') {
      const records = parse(fileBuffer.toString('utf-8'), { columns: true, skip_empty_lines: true });
      rows = records;
      headers = Object.keys(records[0] || {});
    } else if (extension === 'xlsx' || extension === 'xls') {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = xlsx.utils.sheet_to_json(sheet);
      headers = Object.keys(rows[0] || {});
    }

    if (rows.length === 0) throw new Error('No data found in file');

    // 3. Create table ID
    const tableId = `tbl_${uuidv4().replace(/-/g, '_')}`;

    // 4. Infer schema
    const schema = headers.map(col => {
      const sample = rows[0][col];
      let type = 'VARCHAR(255)';
      if (!isNaN(sample) && sample !== '') type = 'DECIMAL(18,4)';
      return { name: col.replace(/[^a-zA-Z0-9_]/g, '_'), type, original: col };
    });

    // 5. Create Aurora table
    const columnDefs = schema.map(c => `${c.name} ${c.type}`).join(', ');
    await rds.send(new ExecuteStatementCommand({
      resourceArn: process.env.AURORA_CLUSTER_ARN,
      secretArn: process.env.AURORA_SECRET_ARN,
      database: process.env.AURORA_DATABASE,
      sql: `CREATE TABLE IF NOT EXISTS ${tableId} (id SERIAL PRIMARY KEY, ${columnDefs}, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
    }));

    // 6. Insert rows (batch of 50)
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      for (const row of batch) {
        const cols = schema.map(c => c.name).join(', ');
        const vals = schema.map(c => `'${String(row[c.original] ?? '').replace(/'/g, "''")}'`).join(', ');
        await rds.send(new ExecuteStatementCommand({
          resourceArn: process.env.AURORA_CLUSTER_ARN,
          secretArn: process.env.AURORA_SECRET_ARN,
          database: process.env.AURORA_DATABASE,
          sql: `INSERT INTO ${tableId} (${cols}) VALUES (${vals})`,
        }));
      }
    }

    // 7. Save metadata to DynamoDB
    const datasetId = uuidv4();
    await dynamo.send(new PutItemCommand({
      TableName: 'data-analysis-datasets',
      Item: {
        datasetId: { S: datasetId },
        sessionId: { S: 'lambda-upload' },
        fileName: { S: fileName },
        fileType: { S: extension },
        tableId: { S: tableId },
        rowCount: { N: rows.length.toString() },
        columnCount: { N: headers.length.toString() },
        schema: { S: JSON.stringify(schema) },
        s3Key: { S: key },
        uploadedAt: { N: Date.now().toString() },
      },
    }));

    console.log(`Done! tableId=${tableId}, datasetId=${datasetId}, rows=${rows.length}`);
    return { statusCode: 200, body: JSON.stringify({ tableId, datasetId, rowCount: rows.length }) };

  } catch (error) {
    console.error('Lambda error:', error);
    throw error;
  }
};