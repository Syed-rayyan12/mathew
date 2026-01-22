import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { NotFoundError, UnauthorizedError } from '../utils';
import { AuthRequest } from '../middleware';
import { generateShortId } from '../utils/id-generator';
import { createNotification } from './notification.controller';

// Get nursery owner's GROUP (created via nursery signup/dashboard)
export const getMyNursery = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Get all nurseries owned by this user
    const userNurseries = await prisma.nursery.findMany({
      where: { ownerId: userId },
      include: {
        reviews: {
          where: { 
            isApproved: true,
            isRejected: false 
          },
          select: { overallRating: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate average rating for each nursery
    const nurseriesWithRatings = userNurseries.map((nursery: any) => {
      const approvedReviews = nursery.reviews;
      const averageRating = approvedReviews.length > 0
        ? approvedReviews.reduce((sum: number, r: any) => sum + r.overallRating, 0) / approvedReviews.length
        : 0;

      const { reviews, ...nurseryData } = nursery;
      return {
        ...nurseryData,
        averageRating: Math.round(averageRating * 10) / 10,
      };
    });

    res.json({
      success: true,
      data: nurseriesWithRatings,
    });
  } catch (error) {
    next(error);
  }
};

// Create a new nursery
export const createNursery = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const {
      name,
      description,
      phone,
      email,
      city,
      ageRange,
      facilities,
      fees,
      openingTime,
      closingTime,
      aboutUs,
      philosophy,
      cardImage,
      images,
      videoUrl,
    } = req.body;

    if (!name || !city) {
      return res.status(400).json({
        success: false,
        message: 'Nursery name and city are required',
      });
    }

    // Find parent group for this user
    const parentGroup = await prisma.group.findFirst({
      where: {
        ownerId: userId,
      },
      select: { id: true },
    });

    if (!parentGroup) {
      return res.status(400).json({
        success: false,
        message: 'Parent group not found. Please complete your settings first.',
      });
    }

    // Generate slug from name
    let slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug already exists and make it unique
    let uniqueSlug = slug;
    let counter = 1;
    while (await prisma.nursery.findUnique({ where: { slug: uniqueSlug } })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    // Generate custom short ID
    const nurseryId = await generateShortId('NUR');

    // Create nursery
    const newNursery = await prisma.nursery.create({
      data: {
        id: nurseryId,
        name,
        slug: uniqueSlug,
        description: description || '',
        phone: phone || '',
        email: email || '',
        city: city,
        ageRange: ageRange || '',
        facilities: facilities || [],
        fees: fees || {},
        openingHours: {
          openingTime: openingTime || '',
          closingTime: closingTime || '',
        },
        aboutUs: aboutUs || '',
        philosophy: philosophy || '',
        cardImage: cardImage || '',
        images: images || [],
        videoUrl: videoUrl || '',
        ownerId: userId,
        groupId: parentGroup.id, // Link to parent group
        isApproved: true,
      },
    });

    // Create notification for new nursery creation
    try {
      await createNotification(
        'New Nursery Created',
        `New nursery "${name}" has been created by a nursery owner`,
        'NURSERY',
        newNursery.id
      );
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Nursery created successfully',
      data: newNursery,
    });
  } catch (error) {
    next(error);
  }
};

// Update nursery profile (from dashboard settings page)
export const updateNursery = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const {
      nurseryId,
      name,
      description,
      phone,
      email,
      city,
      ageRange,
      facilities,
      fees,
      openingTime,
      closingTime,
      aboutUs,
      philosophy,
      cardImage,
      images,
      videoUrl,
    } = req.body;

    // Find nursery
    let nursery;
    if (nurseryId) {
      nursery = await prisma.nursery.findFirst({
        where: { 
          id: nurseryId,
          ownerId: userId 
        },
      });
    } else {
      // Find first nursery owned by user
      nursery = await prisma.nursery.findFirst({
        where: { ownerId: userId },
      });
    }

    if (!nursery) {
      throw new NotFoundError('Nursery not found');
    }

    // Generate slug from name if name is updated
    let slug = nursery.slug;
    if (name && name !== nursery.name) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    // Update nursery
    const updatedNursery = await prisma.nursery.update({
      where: { id: nursery.id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(description !== undefined && { description }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(city !== undefined && { city }),
        ...(ageRange !== undefined && { ageRange }),
        ...(facilities !== undefined && { facilities }),
        ...(fees !== undefined && { fees }),
        ...(openingTime !== undefined || closingTime !== undefined ? {
          openingHours: {
            openingTime: openingTime !== undefined ? openingTime : (nursery.openingHours as any)?.openingTime || '',
            closingTime: closingTime !== undefined ? closingTime : (nursery.openingHours as any)?.closingTime || '',
          }
        } : {}),
        ...(aboutUs !== undefined && { aboutUs }),
        ...(philosophy !== undefined && { philosophy }),
        ...(cardImage !== undefined && { cardImage }),
        ...(images !== undefined && { images }),
        ...(videoUrl !== undefined && { videoUrl }),
      },
    });

    res.json({
      success: true,
      message: 'Nursery profile updated successfully',
      data: updatedNursery,
    });
  } catch (error) {
    next(error);
  }
};

// Delete nursery (admin only - optional for now)
export const deleteNursery = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const nursery = await prisma.nursery.findUnique({
      where: { id },
    });

    if (!nursery) {
      throw new NotFoundError('Nursery not found');
    }

    // Check if user is the owner
    if (nursery.ownerId !== userId && req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('You do not have permission to delete this nursery');
    }

    await prisma.nursery.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Nursery deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get my nursery group (for settings page)
export const getMyGroup = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Find group owned by user
    const group = await prisma.group.findFirst({
      where: { 
        ownerId: userId
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        cardImage: true,
        images: true,
        aboutUs: true,
        description: true,
        city: true,
      },
    });

    if (!group) {
      return res.json({
        success: true,
        data: null,
      });
    }

    res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

// Update nursery group (for settings page)
export const updateNurseryGroup = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const {
      nurseryId,
      name,
      logo,
      cardImage,
      images,
      aboutUs,
      description,
      city,
    } = req.body;

    // Find existing group
    let group = await prisma.group.findFirst({
      where: { 
        ownerId: userId
      },
    });

    // If no group exists, create it (first time settings save)
    if (!group) {
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Nursery name is required to create your group',
        });
      }

      // Generate unique slug
      let slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      let uniqueSlug = slug;
      let counter = 1;
      while (await prisma.group.findUnique({ where: { slug: uniqueSlug } })) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }

      // Generate custom short ID
      const groupId = await generateShortId('GRP');

      // Create new group
      const newGroup = await prisma.group.create({
        data: {
          id: groupId,
          name,
          slug: uniqueSlug,
          ownerId: userId,
          logo: logo || '',
          cardImage: cardImage || '',
          images: images || [],
          aboutUs: aboutUs || '',
          description: description || '',
          city: city || '',
        },
      });

      return res.json({
        success: true,
        message: 'Nursery group created successfully',
        data: newGroup,
      });
    }

    // Update existing group
    let slug = group.slug;
    if (name && name !== group.name) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      let uniqueSlug = slug;
      let counter = 1;
      while (await prisma.group.findUnique({ where: { slug: uniqueSlug } })) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
      slug = uniqueSlug;
    }

    const updatedGroup = await prisma.group.update({
      where: { id: group.id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(logo !== undefined && { logo }),
        ...(cardImage !== undefined && { cardImage }),
        ...(images !== undefined && { images }),
        ...(aboutUs !== undefined && { aboutUs }),
        ...(description !== undefined && { description }),
        ...(city !== undefined && { city }),
      },
    });

    res.json({
      success: true,
      message: 'Nursery group updated successfully',
      data: updatedGroup,
    });
  } catch (error) {
    next(error);
  }
};

// Get nursery owner's reviews with statistics
export const getMyNurseryReviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Find first nursery by owner ID
    const nursery = await prisma.nursery.findFirst({
      where: { ownerId: userId },
      select: { id: true, reviewCount: true },
    });

    if (!nursery) {
      throw new NotFoundError('Nursery not found');
    }

    // Get all reviews (approved, pending, and rejected)
    const [allReviews, approvedCount, pendingCount] = await Promise.all([
      prisma.review.findMany({
        where: { nurseryId: nursery.id },
        select: {
          id: true,
          overallRating: true,
          content: true,
          connection: true,
          visitDate: true,
          firstName: true,
          lastName: true,
          email: true,
          telephone: true,
          initialsOnly: true,
          isApproved: true,
          isRejected: true,
          isVerified: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({
        where: { nurseryId: nursery.id, isApproved: true, isRejected: false },
      }),
      prisma.review.count({
        where: { nurseryId: nursery.id, isApproved: false, isRejected: false },
      }),
    ]);

    // Calculate average rating from approved reviews only
    const approvedReviews = allReviews.filter((r: any) => r.isApproved && !r.isRejected);
    const averageRating = approvedReviews.length > 0
      ? approvedReviews.reduce((sum: number, r: any) => sum + r.overallRating, 0) / approvedReviews.length
      : 0;

    res.json({
      success: true,
      data: {
        reviews: allReviews,
        stats: {
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews: approvedCount,
          pendingApproval: pendingCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
