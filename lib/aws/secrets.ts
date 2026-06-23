import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

interface Credentials {
  auroraHost: string;
  auroraPort: number;
  auroraUsername: string;
  auroraPassword: string;
  auroraDatabaseName: string;
  bedrockRegion: string;
  s3Bucket: string;
  dynamodbRegion: string;
  redisPrimaryEndpoint: string;
  redisPort: number;
  redisAuth: string;
  opensearchEndpoint: string;
  sesRegion: string;
}

let cachedCredentials: Credentials | null = null;
let credentialsCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getSecrets(): Promise<Credentials> {
  // Return cached credentials if still valid
  if (
    cachedCredentials &&
    Date.now() - credentialsCacheTime < CACHE_DURATION
  ) {
    return cachedCredentials;
  }

  const secretName = process.env.SECRETS_MANAGER_ARN || 'data-analysis-secrets';
  const region = process.env.AWS_REGION || 'us-east-1';

  const client = new SecretsManagerClient({ region });

  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);

    let secret: Credentials;

    if (response.SecretString) {
      secret = JSON.parse(response.SecretString) as Credentials;
    } else {
      throw new Error('No SecretString found in Secrets Manager');
    }

    // Cache the credentials
    cachedCredentials = secret;
    credentialsCacheTime = Date.now();

    return secret;
  } catch (error) {
    console.error('[v0] Failed to retrieve secrets from AWS Secrets Manager:', error);
    throw new Error(
      'Failed to load database credentials. Please check AWS Secrets Manager configuration.'
    );
  } finally {
    client.destroy();
  }
}

// Optional: Refresh secrets manually
export function invalidateSecretCache(): void {
  cachedCredentials = null;
  credentialsCacheTime = 0;
}
