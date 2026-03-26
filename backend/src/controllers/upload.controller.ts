import { Request, Response, NextFunction } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import crypto from 'crypto';
import { r2Client, getPublicUrl } from '../config/r2';
import { config } from '../config';

// Generate a unique key for the uploaded file
const generateKey = (originalName: string, ext: string): string => {
  const hash = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();
  const safeName = originalName
    .replace(/\.[^.]+$/, '') // remove extension
    .replace(/[^a-zA-Z0-9-_]/g, '-') // sanitize
    .substring(0, 40);
  return `uploads/${timestamp}-${hash}-${safeName}.${ext}`;
};

// Compress image using sharp → WebP
const compressImage = async (buffer: Buffer, mimetype: string): Promise<{ data: Buffer; ext: string; contentType: string }> => {
  const image = sharp(buffer);
  const metadata = await image.metadata();

  // Resize if wider than 1920px, maintain aspect ratio
  let pipeline = image;
  if (metadata.width && metadata.width > 1920) {
    pipeline = pipeline.resize(1920, undefined, { withoutEnlargement: true });
  }

  // Convert to WebP for smaller file size
  const data = await pipeline
    .webp({ quality: 80 })
    .toBuffer();

  return { data, ext: 'webp', contentType: 'image/webp' };
};

// Upload buffer to R2
const uploadToR2 = async (
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> => {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return getPublicUrl(key);
};

// Process and upload a single file
const processFile = async (file: Express.Multer.File): Promise<string> => {
  const isImage = file.mimetype.startsWith('image/');

  if (isImage) {
    const { data, ext, contentType } = await compressImage(file.buffer, file.mimetype);
    const key = generateKey(file.originalname, ext);
    return uploadToR2(data, key, contentType);
  } else {
    // Video — upload as-is
    const ext = file.originalname.split('.').pop() || 'mp4';
    const key = generateKey(file.originalname, ext);
    return uploadToR2(file.buffer, key, file.mimetype);
  }
};

// POST /api/upload — single file
export const uploadSingleFile = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided',
      });
    }

    const url = await processFile(req.file);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: { url },
    });
  } catch (error) {
    console.error('Upload error:', error);
    next(error);
  }
};

// POST /api/upload/multiple — multiple files
export const uploadMultipleFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided',
      });
    }

    const urls = await Promise.all(files.map(processFile));

    res.json({
      success: true,
      message: `${urls.length} file(s) uploaded successfully`,
      data: { urls },
    });
  } catch (error) {
    console.error('Upload error:', error);
    next(error);
  }
};
