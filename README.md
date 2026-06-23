# Enterprise Data Analysis Tool

A sophisticated web-based data analysis platform built with Next.js 16, React 19, and Amazon AWS services. Upload CSV/Excel files, query with natural language using AI, and export results in multiple formats (PDF, Excel, CSV, Word).

## Architecture Overview

### Frontend
- **Framework:** Next.js 16 (App Router)
- **UI Library:** React 19 + shadcn/ui components
- **Styling:** Tailwind CSS v4 with custom dark enterprise theme
- **Icons:** Lucide React
- **State Management:** React hooks with session-based state

### Backend Services
- **File Storage:** Amazon S3 (pre-signed URLs for direct browser uploads)
- **Database:** Aurora PostgreSQL (dynamic table creation from uploads)
- **Chat History:** DynamoDB (conversation persistence per session)
- **Query Caching:** ElastiCache Redis (24-hour TTL)
- **Suggestions:** OpenSearch Serverless (column value autocomplete)
- **AI Engine:** Amazon Bedrock (Claude 3 Sonnet for SQL generation)
- **Email Delivery:** SES (for large export downloads)
- **Secrets:** AWS Secrets Manager (all credentials at runtime)

### Export Capabilities
- **PDF:** jsPDF + autotable (client-side)
- **Excel:** xlsx library with formatting
- **CSV:** Papa Parse
- **Word:** docx library with tables

## Project Structure

```
/app
  ├── page.tsx                    # Main entry point with session management
  ├── layout.tsx                  # Root layout with metadata
  ├── globals.css                 # Dark theme design tokens
  └── api/
      ├── upload-url/route.ts     # Generate S3 pre-signed URLs
      ├── analyze/route.ts        # Bedrock SQL + Aurora execution
      ├── suggest/route.ts        # OpenSearch column suggestions
      ├── list-tables/route.ts    # Get user's datasets from DynamoDB
      └── export/route.ts         # Async export job handler

/components
  ├── DataAnalysisTool.tsx        # Main container component
  ├── Header.tsx                  # App header with branding
  ├── FileUploadFlow.tsx          # S3 upload UI with drag-drop
  ├── QueryInterface.tsx          # Natural language query input
  ├── ResultsTable.tsx            # Paginated, sortable results
  └── ExportButtons.tsx           # Multi-format export UI

/lib
  ├── types.ts                    # Shared TypeScript interfaces
  ├── aws/
  │   ├── secrets.ts              # AWS Secrets Manager client
  │   ├── aurora.ts               # Aurora PostgreSQL utilities
  │   ├── dynamodb.ts             # DynamoDB operations
  │   ├── bedrock.ts              # Claude 3 Sonnet wrapper
  │   ├── redis.ts                # ElastiCache Redis client
  │   ├── opensearch.ts           # OpenSearch Serverless
  │   └── s3.ts                   # S3 file operations
  └── exporters/
      ├── pdfExporter.ts          # jsPDF export
      ├── excelExporter.ts        # xlsx export
      ├── csvExporter.ts          # Papa Parse CSV
      └── wordExporter.ts         # docx Word export
```

## Features

### 1. File Upload
- Drag-and-drop CSV/Excel files
- S3 pre-signed URLs for secure direct uploads
- File validation (type, size)
- Session-based dataset tracking

### 2. Natural Language Queries
- Ask questions in plain English
- Amazon Bedrock Claude 3 Sonnet generates SQL
- Automatic table schema detection
- Chat history persistence
- SQL query introspection for debugging

### 3. Results Display
- Interactive paginated table (10, 25, 50, 100 rows per page)
- Column sorting (ascending/descending)
- Row-level data inspection
- Execution time and cache status display

### 4. Multi-Format Export
- **Small datasets (≤5K rows):** Client-side instant export
  - PDF with formatted headers and alternating rows
  - Excel with metadata sheet and auto-fit columns
  - CSV with proper escaping
  - Word with styled tables
- **Large datasets (>5K rows):** Async Lambda processing
  - Generate file on server
  - Store in S3
  - Email download link to user

### 5. Advanced Features
- Query result caching (24-hour Redis TTL)
- Column value autocomplete via OpenSearch
- Multiple datasets per session
- Query history tracking
- Session persistence in localStorage

## Configuration

### Environment Variables

All credentials are fetched from AWS Secrets Manager at runtime. No hardcoded secrets in env vars.

Required environment variables:
```
AWS_REGION=us-east-1
SECRETS_MANAGER_ARN=arn:aws:secretsmanager:region:account:secret:data-analysis-secrets
AURORA_SECRET_ARN=arn:aws:secretsmanager:region:account:secret:aurora-credentials
```

### AWS Secrets Manager Format

The Secrets Manager secret should contain:
```json
{
  "auroraHost": "cluster-endpoint.rds.amazonaws.com",
  "auroraPort": 5432,
  "auroraUsername": "admin",
  "auroraPassword": "secure-password",
  "auroraDatabaseName": "data_analysis",
  "bedrockRegion": "us-east-1",
  "s3Bucket": "data-analysis-bucket",
  "dynamodbRegion": "us-east-1",
  "redisPrimaryEndpoint": "redis-endpoint.cache.amazonaws.com",
  "redisPort": 6379,
  "redisAuth": "redis-auth-token",
  "opensearchEndpoint": "opensearch-domain-endpoint",
  "sesRegion": "us-east-1"
}
```

## Data Flow

1. **Upload**
   - User selects file → Get S3 pre-signed URL → Direct upload to S3
   - Lambda triggered → Parse CSV/Excel → Create Aurora table → Store metadata in DynamoDB

2. **Query**
   - User asks question → Fetch table schema from Aurora
   - Load chat history from DynamoDB
   - Call Bedrock with schema + question → Get SQL query
   - Check Redis cache (MD5 hash of query)
   - Execute SQL on Aurora if not cached
   - Cache result in Redis (24h TTL)
   - Save messages in DynamoDB
   - Return results to UI

3. **Export**
   - User clicks export button
   - If ≤5K rows: Generate file client-side (jsPDF, xlsx, docx, Papa Parse)
   - If >5K rows: Trigger Lambda → Generate → Upload to S3 → Send SES email

## Security

- **S3 Pre-signed URLs:** 15-minute expiry for uploads, 48-hour for downloads
- **Aurora:** Parameterized queries prevent SQL injection
- **Bedrock:** SQL query validation before execution
- **DynamoDB:** Encryption at rest, no sensitive data stored
- **Secrets Manager:** All credentials fetched at runtime, never hardcoded
- **CORS:** Properly configured for S3 uploads

## Performance Optimizations

- Redis caching for frequently queried results
- ElastiCache for autocomplete suggestions
- Pagination limits (max 10,000 rows per query)
- S3 direct upload bypasses server bandwidth
- Server-side export processing for large datasets
- DynamoDB on-demand pricing for variable load

## API Routes

### POST `/api/upload-url`
Generate S3 pre-signed upload URL

**Request:**
```json
{
  "fileName": "sales_data.csv",
  "fileType": "text/csv"
}
```

**Response:**
```json
{
  "uploadUrl": "https://s3.../presigned...",
  "uploadId": "uuid",
  "expiresIn": 900,
  "s3Key": "uploads/timestamp-random/sales_data.csv"
}
```

### POST `/api/analyze`
Execute Bedrock SQL generation and Aurora query

**Request:**
```json
{
  "sessionId": "user-session-id",
  "datasetId": "table_name",
  "question": "Show sales over $1000",
  "useCache": true
}
```

**Response:**
```json
{
  "resultId": "uuid",
  "rows": [...],
  "columns": ["col1", "col2"],
  "rowCount": 1234,
  "executionTime": 125,
  "sqlQuery": "SELECT...",
  "isCached": false,
  "summary": "Found 1,234 records matching criteria"
}
```

### POST `/api/suggest`
Get column value suggestions from OpenSearch

**Request:**
```json
{
  "tableId": "table_name",
  "columnName": "region",
  "prefix": "US"
}
```

**Response:**
```json
{
  "suggestions": ["US-East", "US-West", "US-Central"]
}
```

### POST `/api/list-tables`
Get all datasets for current session

**Request:**
```json
{
  "sessionId": "user-session-id"
}
```

**Response:**
```json
{
  "datasets": [...],
  "count": 5
}
```

### POST `/api/export`
Trigger async export for large datasets

**Request:**
```json
{
  "resultId": "uuid",
  "format": "excel",
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "jobId": "uuid",
  "status": "queued",
  "message": "Export job queued. You will receive an email..."
}
```

## Dependencies

### Runtime
- `next@16.x` - React framework
- `react@19` - UI library
- `papaparse@5.4` - CSV parsing
- `xlsx@0.18` - Excel support
- `jspdf@2.5` - PDF generation
- `jspdf-autotable@3.5` - PDF tables
- `docx@8.5` - Word documents
- `@aws-sdk/*@3.x` - AWS SDK clients
- `uuid@latest` - ID generation
- `lucide-react@latest` - Icons

### Development
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- ESLint

## Getting Started

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set environment variables:**
   ```bash
   export AWS_REGION=us-east-1
   export SECRETS_MANAGER_ARN=arn:aws:secretsmanager:...
   export AURORA_SECRET_ARN=arn:aws:secretsmanager:...
   ```

3. **Configure AWS Secrets Manager:**
   - Create a secret with database and service credentials
   - Update `SECRETS_MANAGER_ARN` to point to it

4. **Run development server:**
   ```bash
   pnpm dev
   ```

5. **Open in browser:**
   ```
   http://localhost:3000
   ```

## Design System

### Colors
- **Primary:** #2980b9 (Blue accent)
- **Background:** #0f1419 (Dark)
- **Card:** #1a1f2e (Slightly lighter)
- **Border:** #2a3142 (Subtle dividers)
- **Text:** #e4e6eb (Light text)
- **Muted:** #a0a8b8 (Secondary text)

### Typography
- **Font:** Geist (sans-serif)
- **Mono:** Geist Mono (code)
- **Heading sizes:** 16px (sm), 20px (base), 24px (lg)

### Spacing
- Base unit: 4px
- Uses Tailwind gap system for flexible layouts

## Future Enhancements

- OAuth authentication with session management
- User workspaces and team collaboration
- Advanced data visualization (charts, dashboards)
- Saved queries and reports
- Real-time query monitoring and cancellation
- Multi-table joins in natural language
- Data lineage and audit trails
- Custom SQL editor with autocomplete
- GraphQL API
- Mobile app

## License

MIT
