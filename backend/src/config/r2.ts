import { S3Client } from '@aws-sdk/client-s3';
import { config } from './index';

// Cloudflare R2 S3-compatible client
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2.accountId}.eu.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
});

// Build public URL for an uploaded object
export const getPublicUrl = (key: string): string => {
  return `${config.r2.publicUrl}/${key}`;
};
