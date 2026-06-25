import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getSecrets } from './secrets';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const region = process.env.AWS_REGION || 'us-east-1';
    s3Client = new S3Client({ region });
  }
  return s3Client;
}

export async function generateUploadUrl(
  fileName: string,
  fileType: string,
  expirationSeconds: number = 900 // 15 minutes
): Promise<{ uploadUrl: string; s3Key: string }> {
  const secrets = await getSecrets();
  const client = getS3Client();

  // Generate unique S3 key
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(7);
  const s3Key = `uploads/${timestamp}-${randomStr}/${fileName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: secrets.s3Bucket,
      Key: s3Key,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: expirationSeconds,
    });

    return { uploadUrl, s3Key };
  } catch (error) {
    console.error('[v0] Error generating S3 upload URL:', error);
    throw error;
  }
}

export async function generateDownloadUrl(
  s3Key: string,
  expirationSeconds: number = 172800 // 48 hours
): Promise<string> {
  const secrets = await getSecrets();
  const client = getS3Client();

  try {
    const command = new GetObjectCommand({
      Bucket: secrets.s3Bucket,
      Key: s3Key,
    });

    const downloadUrl = await getSignedUrl(client, command, {
      expiresIn: expirationSeconds,
    });

    return downloadUrl;
  } catch (error) {
    console.error('[v0] Error generating S3 download URL:', error);
    throw error;
  }
}

export async function downloadFile(s3Key: string): Promise<Buffer> {
  const secrets = await getSecrets();
  const client = getS3Client();

  try {
    const command = new GetObjectCommand({
      Bucket: secrets.s3Bucket,
      Key: s3Key,
    });

    const response = await client.send(command);
    const chunks: Uint8Array[] = [];

    if (response.Body) {
      const reader = response.Body as any;
      for await (const chunk of reader) {
        chunks.push(chunk);
      }
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error('[v0] Error downloading file from S3:', error);
    throw error;
  }
}

export async function uploadFile(
  s3Key: string,
  data: Buffer | string,
  contentType: string
): Promise<void> {
  const secrets = await getSecrets();
  const client = getS3Client();

  try {
    const command = new PutObjectCommand({
      Bucket: secrets.s3Bucket,
      Key: s3Key,
      Body: data,
      ContentType: contentType,
    });

    await client.send(command);
    console.log(`[v0] File uploaded to S3: ${s3Key}`);
  } catch (error) {
    console.error('[v0] Error uploading file to S3:', error);
    throw error;
  }
}
