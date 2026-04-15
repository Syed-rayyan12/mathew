import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { config } from './index';

// Cloudflare R2 S3-compatible client
export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${config.r2.accountId}.eu.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 10_000,       // 10s to establish connection
    requestTimeout: 600_000,         // 10 minutes for large video uploads
  }),
});

// Build public URL for an uploaded object
export const getPublicUrl = (key: string): string => {
  return `${config.r2.publicUrl}/${key}`;
};
