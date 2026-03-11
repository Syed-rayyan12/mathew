import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware';
import { NotFoundError } from '../utils';
import { generateRandomId } from '../utils/id-generator';
import { createNotification } from './notification.controller';

// GET /shortlist — get logged-in user's shortlisted nurseries
export const getMyShortlist = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;

    const shortlist = await prisma.shortlist.findMany({
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
            logo: true,
            reviewCount: true,
            reviews: {
              where: { isApproved: true },
              select: { overallRating: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute average rating for each nursery
    const data = shortlist.map((entry) => {
      const reviews = entry.nursery.reviews;
      const avgRating =
        reviews.length > 0
          ? Math.round((reviews.reduce((s, r) => s + r.overallRating, 0) / reviews.length) * 10) / 10
          : 0;
      const { reviews: _r, ...nursery } = entry.nursery;
      return { ...entry, nursery: { ...nursery, averageRating: avgRating } };
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

// POST /shortlist/:nurseryId — add nursery to shortlist
export const addToShortlist = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { nurseryId } = req.params;

    // Check nursery exists
    const nursery = await prisma.nursery.findUnique({ where: { id: nurseryId } });
    if (!nursery) throw new NotFoundError('Nursery not found');

    // Upsert — silently succeeds if already in shortlist
    const wasAlreadyShortlisted = await prisma.shortlist.findUnique({
      where: { userId_nurseryId: { userId, nurseryId } },
    });

    const entry = await prisma.shortlist.upsert({
      where: { userId_nurseryId: { userId, nurseryId } },
      update: {},
      create: { id: generateRandomId(12), userId, nurseryId },
      include: {
        nursery: {
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            town: true,
            cardImage: true,
            logo: true,
            reviewCount: true,
          },
        },
      },
    });

    // Only notify the nursery when it is newly added to a shortlist
    if (!wasAlreadyShortlisted) {
      try {
        await createNotification(
          'Added to Shortlist',
          `Your nursery "${nursery.name}" was added to a parent's shortlist`,
          'NURSERY',
          nurseryId
        );
      } catch (notificationError) {
        console.error('❌ Failed to create shortlist notification:', notificationError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Added to shortlist',
      data: entry,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /shortlist/:nurseryId — remove nursery from shortlist
export const removeFromShortlist = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { nurseryId } = req.params;

    await prisma.shortlist.deleteMany({
      where: { userId, nurseryId },
    });

    res.json({
      success: true,
      message: 'Removed from shortlist',
    });
  } catch (error) {
    next(error);
  }
};

// GET /shortlist/check/:nurseryId — check if a nursery is shortlisted
export const checkShortlisted = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { nurseryId } = req.params;

    const entry = await prisma.shortlist.findUnique({
      where: { userId_nurseryId: { userId, nurseryId } },
    });

    res.json({
      success: true,
      data: { isShortlisted: !!entry },
    });
  } catch (error) {
    next(error);
  }
};
