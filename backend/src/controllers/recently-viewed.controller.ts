import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware';
import { generateRandomId } from '../utils/id-generator';

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
          },
        },
      },
      orderBy: { viewedAt: 'desc' },
      take: 10,
    });

    // Aggregate averages in the DB, scoped to the viewed nurseries only
    const avgRatings = await db.review.groupBy({
      by: ['nurseryId'],
      where: {
        nurseryId: { in: viewed.map((e: any) => e.nurseryId) },
        isApproved: true,
        isRejected: false,
      },
      _avg: { overallRating: true },
    });
    const ratingMap = new Map(avgRatings.map((r: any) => [r.nurseryId, r._avg.overallRating ?? 0]));

    const data = viewed.map((entry: any) => ({
      ...entry,
      nursery: {
        ...entry.nursery,
        averageRating: Math.round(((ratingMap.get(entry.nurseryId) as number) ?? 0) * 10) / 10,
      },
    }));

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
