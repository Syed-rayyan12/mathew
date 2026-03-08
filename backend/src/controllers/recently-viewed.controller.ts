import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware';
import { generateRandomId } from '../utils/id-generator';

const prisma = new PrismaClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// POST /recently-viewed/:nurseryId — record a nursery visit
export const recordView = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { nurseryId } = req.params;

    // Upsert: if already viewed, just update viewedAt timestamp
    await db.recentlyViewed.upsert({
      where: { userId_nurseryId: { userId, nurseryId } },
      update: { viewedAt: new Date() },
      create: { id: generateRandomId(12), userId, nurseryId },
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// GET /recently-viewed — get last 10 recently viewed nurseries
export const getRecentlyViewed = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;

    const viewed = await db.recentlyViewed.findMany({
      where: { userId },
      include: {
        nursery: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            town: true,
            cardImage: true,
            reviewCount: true,
            reviews: {
              where: { isApproved: true },
              select: { overallRating: true },
            },
          },
        },
      },
      orderBy: { viewedAt: 'desc' },
      take: 10,
    });

    // Compute average rating
    const data = viewed.map((entry: any) => {
      const reviews = entry.nursery.reviews as { overallRating: number }[];
      const avgRating =
        reviews.length > 0
          ? Math.round((reviews.reduce((s: number, r: { overallRating: number }) => s + r.overallRating, 0) / reviews.length) * 10) / 10
          : 0;
      const { reviews: _r, ...nursery } = entry.nursery;
      return { ...entry, nursery: { ...nursery, averageRating: avgRating } };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// DELETE /recently-viewed — clear all recently viewed
export const clearRecentlyViewed = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    await db.recentlyViewed.deleteMany({ where: { userId } });
    res.json({ success: true, message: 'Recently viewed cleared' });
  } catch (error) {
    next(error);
  }
};
