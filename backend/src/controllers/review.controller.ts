import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils';
import { AuthRequest } from '../middleware';
import { generateShortId } from '../utils/id-generator';
import { createNotification } from './notification.controller';

// Nursery owners may only moderate reviews of nurseries they own; admins may moderate any
const assertCanModerateReview = async (req: AuthRequest, reviewId: string) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { nurseryId: true },
  });

  if (!review) {
    throw new NotFoundError('Review not found');
  }

  if (req.user?.role !== 'ADMIN') {
    const ownedNursery = await prisma.nursery.findFirst({
      where: { id: review.nurseryId, ownerId: req.user?.userId },
    });

    if (!ownedNursery) {
      throw new ForbiddenError('Not authorised to manage reviews for this nursery');
    }
  }
};

// Submit a review for a nursery (authentication optional)
export const submitReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      nurseryId,
      overallRating,
      content,
      connection,
      visitDate,
      facilities,
      learning,
      resources,
      care,
      activities,
      staff,
      food,
      management,
      cleanliness,
      safeguarding,
      value,
      firstName,
      lastName,
      email,
      telephone,
      initialsOnly,
    } = req.body;

    // Get userId if user is authenticated (optional)
    const userId = req.user?.userId || null;

    // Check if nursery exists
    const nursery = await prisma.nursery.findUnique({
      where: { id: nurseryId },
    });

    if (!nursery) {
      throw new NotFoundError('Nursery not found');
    }

    // Generate custom short ID
    const reviewId = await generateShortId('REV');

    // Create review
    const review = await prisma.review.create({
      data: {
        id: reviewId,
        nurseryId,
        userId, // Add userId if authenticated
        overallRating: Number(overallRating),
        content,
        connection,
        visitDate: visitDate ? new Date(visitDate) : null,
        facilities: facilities ? Number(facilities) : null,
        learning: learning ? Number(learning) : null,
        resources: resources ? Number(resources) : null,
        care: care ? Number(care) : null,
        activities: activities ? Number(activities) : null,
        staff: staff ? Number(staff) : null,
        food: food ? Number(food) : null,
        management: management ? Number(management) : null,
        cleanliness: cleanliness ? Number(cleanliness) : null,
        safeguarding: safeguarding ? Number(safeguarding) : null,
        value: value ? Number(value) : null,
        firstName,
        lastName,
        email,
        telephone,
        initialsOnly: initialsOnly || false,
        isApproved: true, // Auto-approve for now
        isVerified: false,
      },
    });

    // Update nursery review count only (rating is calculated from reviews)
    const reviewCount = await prisma.review.count({
      where: { nurseryId, isApproved: true },
    });

    await prisma.nursery.update({
      where: { id: nurseryId },
      data: { reviewCount },
    });

    // Create notification for new review — entityId = nurseryId so nursery dashboard can filter it
    try {
      await createNotification(
        'New Review Received',
        `${firstName} ${lastName} has submitted a review for "${nursery.name}" with ${overallRating} star(s)`,
        'REVIEW',
        nurseryId
      );
    } catch (notificationError) {
      console.error('❌ Failed to create notification:', notificationError);
    }
    
    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const getNurseryReviews = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { nurseryId } = req.params;
    const { page = 1, limit = 100 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          nurseryId,
          isApproved: true,
        },
        select: {
          id: true,
          overallRating: true,
          content: true,
          connection: true,
          visitDate: true,
          firstName: true,
          lastName: true,
          initialsOnly: true,
          isVerified: true,
          createdAt: true,
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({
        where: { 
          nurseryId, 
          isApproved: true,
          isRejected: false 
        },
      }),
    ]);

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserReviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const userEmail = req.user!.email;

    // Find reviews by userId OR by email (for reviews submitted before userId was saved)
    const reviews = await prisma.review.findMany({
      where: {
        OR: [
          { userId: userId },
          { email: userEmail }
        ]
      },
      include: {
        nursery: {
          select: { name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

export const approveReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await assertCanModerateReview(req, id);

    const review = await prisma.review.update({
      where: { id },
      data: {
        isApproved: true,
        isRejected: false,
        rejectedAt: null,
        rejectionReason: null
      },
    });

    // Update nursery review count only
    const reviewCount = await prisma.review.count({
      where: { nurseryId: review.nurseryId, isApproved: true },
    });

    await prisma.nursery.update({
      where: { id: review.nurseryId },
      data: { reviewCount },
    });

    // Notify the parent that their review has been published
    if (review.userId) {
      try {
        const nursery = await prisma.nursery.findUnique({ where: { id: review.nurseryId }, select: { name: true } });
        await createNotification(
          'Review Published',
          `Your review for "${nursery?.name}" has been published.`,
          'USER',
          review.userId
        );
      } catch (notificationError) {
        console.error('Failed to create review approved notification:', notificationError);
      }
    }

    res.json({
      success: true,
      message: 'Review approved successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const unapproveReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await assertCanModerateReview(req, id);

    const review = await prisma.review.update({
      where: { id },
      data: {
        isApproved: false,
        isRejected: false,
        rejectedAt: null,
        rejectionReason: null
      },
    });

    // Update nursery review count - exclude unapproved reviews
    const reviewCount = await prisma.review.count({
      where: {
        nurseryId: review.nurseryId,
        isApproved: true,
        isRejected: false
      },
    });

    await prisma.nursery.update({
      where: { id: review.nurseryId },
      data: { reviewCount },
    });

    res.json({
      success: true,
      message: 'Review unapproved successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Allow both ADMIN and NURSERY_OWNER to reject reviews
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'NURSERY_OWNER') {
      throw new Error('Only admins or nursery owners can reject reviews');
    }

    await assertCanModerateReview(req, id);

    const review = await prisma.review.update({
      where: { id },
      data: { 
        isApproved: false,
        isRejected: true,
        rejectedAt: new Date(),
        rejectionReason: reason || 'Review rejected'
      },
    });

    // Update nursery review count - exclude rejected reviews
    const reviewCount = await prisma.review.count({
      where: {
        nurseryId: review.nurseryId,
        isApproved: true,
        isRejected: false
      },
    });

    await prisma.nursery.update({
      where: { id: review.nurseryId },
      data: { reviewCount },
    });

    // Notify the parent that their review has been rejected
    if (review.userId) {
      try {
        const nursery = await prisma.nursery.findUnique({ where: { id: review.nurseryId }, select: { name: true } });
        await createNotification(
          'Review Not Approved',
          `Your review for "${nursery?.name}" was not approved. Reason: ${reason || 'No reason provided'}`,
          'USER',
          review.userId
        );
      } catch (notificationError) {
        console.error('Failed to create review rejected notification:', notificationError);
      }
    }

    res.json({
      success: true,
      message: 'Review rejected successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const unrejectReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      throw new Error('Only admins can unreject reviews');
    }

    const review = await prisma.review.update({
      where: { id },
      data: { 
        isRejected: false,
        rejectedAt: null,
        rejectionReason: null
      },
    });

    // Update nursery review count
    const reviewCount = await prisma.review.count({
      where: {
        nurseryId: review.nurseryId,
        isApproved: true,
        isRejected: false
      },
    });

    await prisma.nursery.update({
      where: { id: review.nurseryId },
      data: { reviewCount },
    });

    res.json({
      success: true,
      message: 'Review restored successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.review.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
