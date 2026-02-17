import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { comparePassword, generateTokens, UnauthorizedError } from '../utils';
import { AuthRequest } from '../middleware';
import { createNotification } from './notification.controller';

// Fixed admin credentials
const ADMIN_EMAIL = 'admin@mathew.com';
const ADMIN_PASSWORD = 'Admin@123456';

// Admin Signin
export const adminSignin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Validate against fixed credentials
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: 'admin',
      email: ADMIN_EMAIL,
      role: 'ADMIN',
    });

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        email: ADMIN_EMAIL,
        role: 'ADMIN',
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all nursery groups
export const getAllGroups = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Admin access required');
    }

    const {
      searchQuery = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'all', // all, online, offline
    } = req.query;

    // Build where clause
    const whereClause: any = {};

    // Search by group name, owner name, email, or city
    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery as string, mode: 'insensitive' } },
        { city: { contains: searchQuery as string, mode: 'insensitive' } },
        { owner: { firstName: { contains: searchQuery as string, mode: 'insensitive' } } },
        { owner: { lastName: { contains: searchQuery as string, mode: 'insensitive' } } },
        { owner: { email: { contains: searchQuery as string, mode: 'insensitive' } } },
      ];
    }

    // Status filter (owner online/offline)
    if (status === 'online') {
      whereClause.owner = { isOnline: true };
    } else if (status === 'offline') {
      whereClause.owner = { isOnline: false };
    }

    // Build orderBy
    const orderBy: any = {};
    if (sortBy === 'owner') {
      orderBy.owner = { firstName: sortOrder as string };
    } else if (sortBy === 'nurseries') {
      orderBy.nurseries = { _count: sortOrder as string };
    } else {
      orderBy[sortBy as string] = sortOrder as string;
    }

    const groups = await prisma.group.findMany({
      where: whereClause,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isOnline: true,
          },
        },
        nurseries: {
          select: {
            town: true,
            city: true,
          },
          take: 1,
        },
        _count: {
          select: {
            nurseries: true,
          },
        },
      },
      orderBy,
    });

    // Flatten the data to avoid nested objects in React
    const flattenedGroups = groups.map((group: any) => ({
      id: group.id,
      name: group.name,
      slug: group.slug,
      address: group.address,
      city: group.city || (group.nurseries && group.nurseries[0]?.city) || "",
      town: group.town || (group.nurseries && group.nurseries[0]?.town) || "",
      postcode: group.postcode,
      aboutUs: group.aboutUs,
      description: group.description,
      logo: group.logo,
      cardImage: group.cardImage,
      images: group.images,
      isActive: group.isActive,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      ownerId: group.ownerId,
      ownerFirstName: group.owner.firstName,
      ownerLastName: group.owner.lastName,
      ownerEmail: group.owner.email,
      ownerPhone: group.owner.phone,
      ownerIsOnline: group.owner.isOnline,
      nurseriesCount: group._count.nurseries,
    }));

    res.json({
      success: true,
      data: flattenedGroups,
    });
  } catch (error) {
    next(error);
  }
};

// Get all nurseries (including children)
export const getAllNurseriesAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Admin access required');
    }

    const {
      searchQuery = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'all', // all, online, offline
    } = req.query;

    // Build where clause
    const whereClause: any = {};

    // Search by nursery name, city, or owner name
    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery as string, mode: 'insensitive' } },
        { city: { contains: searchQuery as string, mode: 'insensitive' } },
        { owner: { firstName: { contains: searchQuery as string, mode: 'insensitive' } } },
        { owner: { lastName: { contains: searchQuery as string, mode: 'insensitive' } } },
        { group: { name: { contains: searchQuery as string, mode: 'insensitive' } } },
      ];
    }

    // Status filter (owner online/offline)
    if (status === 'online') {
      whereClause.owner = { isOnline: true };
    } else if (status === 'offline') {
      whereClause.owner = { isOnline: false };
    }

    // Build orderBy
    const orderBy: any = {};
    if (sortBy === 'owner') {
      orderBy.owner = { firstName: sortOrder as string };
    } else if (sortBy === 'group') {
      orderBy.group = { name: sortOrder as string };
    } else {
      orderBy[sortBy as string] = sortOrder as string;
    }

    const nurseries = await prisma.nursery.findMany({
      where: whereClause,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isOnline: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
        reviews: {
          where: { 
            isApproved: true,
            isRejected: false 
          },
          select: { overallRating: true },
        },
      },
      orderBy,
    });

    // Calculate average rating and flatten data
    const nurseriesWithRatings = nurseries.map((nursery: any) => {
      const approvedReviews = nursery.reviews;
      const averageRating = approvedReviews.length > 0
        ? approvedReviews.reduce((sum: number, r: any) => sum + r.overallRating, 0) / approvedReviews.length
        : 0;

      return {
        id: nursery.id,
        name: nursery.name,
        slug: nursery.slug,
        description: nursery.description,
        address: nursery.address,
        city: nursery.city,
        town: nursery.town,
        postcode: nursery.postcode,
        phone: nursery.phone,
        email: nursery.email,
        website: nursery.website,
        logo: nursery.logo,
        cardImage: nursery.cardImage,
        images: nursery.images,
        reviewCount: nursery.reviewCount,
        isVerified: nursery.isVerified,
        isApproved: nursery.isApproved,
        isActive: nursery.isActive,
        openingHours: nursery.openingHours,
        ageRange: nursery.ageRange,
        capacity: nursery.capacity,
        fees: nursery.fees,
        facilities: nursery.facilities,
        createdAt: nursery.createdAt,
        updatedAt: nursery.updatedAt,
        ownerId: nursery.ownerId,
        groupId: nursery.groupId,
        aboutUs: nursery.aboutUs,
        philosophy: nursery.philosophy,
        videoUrl: nursery.videoUrl,
        ownerFirstName: nursery.owner.firstName,
        ownerLastName: nursery.owner.lastName,
        ownerEmail: nursery.owner.email,
        ownerPhone: nursery.owner.phone,
        ownerIsOnline: nursery.owner.isOnline,
        groupName: nursery.group?.name || null,
        averageRating: Math.round(averageRating * 10) / 10,
        reviewsCount: approvedReviews.length,
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

// Get all users (regular users only - USER, PARENT roles)
export const getAllUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Admin access required');
    }

    const {
      searchQuery = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'all', // all, online, offline
      role = 'all', // all, USER, PARENT
    } = req.query;

    // Build where clause
    const whereClause: any = {
      role: {
        in: ['USER', 'PARENT']
      }
    };

    // Search by name or email
    if (searchQuery) {
      whereClause.OR = [
        { firstName: { contains: searchQuery as string, mode: 'insensitive' } },
        { lastName: { contains: searchQuery as string, mode: 'insensitive' } },
        { email: { contains: searchQuery as string, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status === 'online') {
      whereClause.isOnline = true;
    } else if (status === 'offline') {
      whereClause.isOnline = false;
    }

    // Role filter
    if (role !== 'all' && (role === 'USER' || role === 'PARENT')) {
      whereClause.role = role;
    }

    // Build orderBy
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder as string;

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isVerified: true,
        isOnline: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy,
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// Get all nursery owners
export const getAllNurseryOwners = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Admin access required');
    }

    const nurseryOwners = await prisma.user.findMany({
      where: {
        role: 'NURSERY_OWNER'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        nurseryName: true,
        role: true,
        isVerified: true,
        isOnline: true,
        createdAt: true,
        _count: {
          select: {
            nurseries: true,
            groups: true,
            reviews: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: nurseryOwners,
    });
  } catch (error) {
    next(error);
  }
};

// Get dashboard statistics
export const getDashboardStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Admin access required');
    }

    const [totalNurseries, totalGroups, totalUsers, totalReviews, rejectedReviews, pendingApprovals] = await Promise.all([
      prisma.nursery.count(),
      prisma.group.count(),
      prisma.user.count(),
      prisma.review.count(),
      prisma.review.count({ where: { isRejected: true } }),
      prisma.user.count({ where: { isActive: false } }),
    ]);

    res.json({
      success: true,
      data: {
        totalNurseries,
        totalGroups,
        totalUsers,
        totalReviews,
        rejectedReviews,
        pendingApprovals,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete a group
export const deleteGroup = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Admin access required');
    }

    const { id } = req.params;

    // Delete the group (nurseries will be set to null due to onDelete: SetNull)
    await prisma.group.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Group deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Delete a nursery
export const deleteNursery = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Admin access required');
    }

    const { id } = req.params;

    // Delete the nursery (reviews and shortlists will be cascaded)
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

// Toggle group active status
export const toggleGroupStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Admin access required');
    }

    const { id } = req.params;

    // Get current group status
    const group = await prisma.group.findUnique({
      where: { id },
      select: { isActive: true, name: true },
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Toggle the status
    const updatedGroup = await prisma.group.update({
      where: { id },
      data: { isActive: !group.isActive },
    });

    res.json({
      success: true,
      message: `Group ${updatedGroup.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedGroup,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle nursery approved status (acts as active/deactive)
export const toggleNurseryStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Admin access required');
    }

    const { id } = req.params;

    // Get current nursery status
    const nursery = await prisma.nursery.findUnique({
      where: { id },
      select: { isApproved: true, name: true },
    });

    if (!nursery) {
      return res.status(404).json({
        success: false,
        message: 'Nursery not found',
      });
    }

    // Toggle the status
    const updatedNursery = await prisma.nursery.update({
      where: { id },
      data: { isApproved: !nursery.isApproved },
    });

    res.json({
      success: true,
      message: `Nursery ${updatedNursery.isApproved ? 'activated' : 'deactivated'} successfully`,
      data: updatedNursery,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a user
export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Admin access required');
    }

    const { id } = req.params;

    // Delete the user (reviews and shortlists will be cascaded)
    await prisma.user.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get all reviews with search and filter
export const getAllReviews = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Admin access required');
    }

    const {
      searchQuery = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status = 'all', // all, pending, approved, rejected
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause for filtering
    const whereClause: any = {};

    // Status filter
    if (status === 'pending') {
      whereClause.isApproved = false;
      whereClause.isRejected = false;
    } else if (status === 'approved') {
      whereClause.isApproved = true;
      whereClause.isRejected = false;
    } else if (status === 'rejected') {
      whereClause.isRejected = true;
    }

    // Search by reviewer name, nursery name, or email
    if (searchQuery) {
      whereClause.OR = [
        { firstName: { contains: searchQuery as string, mode: 'insensitive' } },
        { lastName: { contains: searchQuery as string, mode: 'insensitive' } },
        { email: { contains: searchQuery as string, mode: 'insensitive' } },
        { nursery: { name: { contains: searchQuery as string, mode: 'insensitive' } } },
      ];
    }

    // Build orderBy
    const orderBy: any = {};
    if (sortBy === 'rating') {
      orderBy.overallRating = sortOrder as string;
    } else if (sortBy === 'nursery') {
      orderBy.nursery = { name: sortOrder as string };
    } else {
      orderBy[sortBy as string] = sortOrder as string;
    }

    console.log('📋 Fetching reviews with filters:', { status, searchQuery, sortBy, sortOrder, page, limit });

    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where: whereClause,
        include: {
          nursery: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy,
        skip,
        take: Number(limit),
      }),
      prisma.review.count({ where: whereClause }),
    ]);

    console.log(`✅ Found ${reviews.length} reviews out of ${totalCount} total`);

    const formattedReviews = reviews.map((review: any) => ({
      id: review.id,
      firstName: review.firstName,
      lastName: review.lastName,
      email: review.email,
      nursery: {
        id: review.nursery.id,
        name: review.nursery.name,
        slug: review.nursery.slug,
      },
      user: review.user ? {
        id: review.user.id,
        firstName: review.user.firstName,
        lastName: review.user.lastName,
        email: review.user.email,
      } : null,
      title: review.title,
      content: review.content,
      overallRating: review.overallRating,
      activities: review.activities,
      care: review.care,
      cleanliness: review.cleanliness,
      facilities: review.facilities,
      food: review.food,
      learning: review.learning,
      management: review.management,
      resources: review.resources,
      safeguarding: review.safeguarding,
      staff: review.staff,
      value: review.value,
      visitDate: review.visitDate,
      isApproved: review.isApproved,
      isRejected: review.isRejected,
      rejectionReason: review.rejectionReason,
      rejectedAt: review.rejectedAt,
      status: review.isRejected ? 'rejected' : review.isApproved ? 'approved' : 'pending',
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    }));

    res.json({
      success: true,
      data: {
        reviews: formattedReviews,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get users pending approval
export const getUsersPendingApproval = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Admin access required');
    }

    const { searchQuery = '', sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Build where clause
    const whereClause: any = {
      isActive: false, // Get only inactive users waiting for approval
    };

    // Search filter
    if (searchQuery) {
      whereClause.OR = [
        { firstName: { contains: searchQuery as string, mode: 'insensitive' } },
        { lastName: { contains: searchQuery as string, mode: 'insensitive' } },
        { email: { contains: searchQuery as string, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder as string;

    const pendingUsers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy,
    });

    res.json({
      success: true,
      data: pendingUsers,
    });
  } catch (error) {
    next(error);
  }
};

// Approve user
export const approveUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Admin access required');
    }

    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    // Create notification for user approval
    try {
      await createNotification(
        'User Approved',
        `${user.firstName} ${user.lastName} (${user.email}) has been approved by admin`,
        'USER',
        user.id
      );
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'User approved successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Reject user (delete or keep as inactive)
export const rejectUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Admin access required');
    }

    const { id } = req.params;

    // Option 1: Delete the user
    await prisma.user.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'User rejected and deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get monthly user registration data
export const getMonthlyUserStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { months = 12 } = req.query;
    const monthsCount = Number(months);

    // Get current date
    const now = new Date();
    
    // Get users from last N months
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsCount + 1, 1);

    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by month
    const monthlyData: { [key: string]: number } = {};
    
    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      monthlyData[monthKey] = 0;
    }

    // Count users per month
    users.forEach((user: any) => {
      const monthKey = new Date(user.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      if (monthlyData[monthKey] !== undefined) {
        monthlyData[monthKey]++;
      }
    });

    const chartData = Object.entries(monthlyData).map(([month, count]) => ({
      month,
      users: count,
      _count: count,
    }));

    res.json({
      success: true,
      data: {
        monthlyUsers: chartData,
        totalUsers: users.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all articles (admin view - includes all articles regardless of publish status)
export const getAllArticles = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      throw new UnauthorizedError('Admin access required');
    }

    const {
      searchQuery = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      category = 'all',
      page = 1,
      limit = 20,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const whereClause: any = {};

    // Search by article name or card heading
    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery as string, mode: 'insensitive' } },
        { cardHeading: { contains: searchQuery as string, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (category !== 'all') {
      whereClause.category = category;
    }

    // Build orderBy
    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder as string;

    const [articles, totalCount] = await Promise.all([
      prisma.article.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: Number(limit),
      }),
      prisma.article.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      data: articles,
    });
  } catch (error) {
    next(error);
  }
};

// Get monthly review submission data
export const getMonthlyReviewStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { months = 12 } = req.query;
    const monthsCount = Number(months);

    // Get current date
    const now = new Date();

    // Get reviews from last N months
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsCount + 1, 1);

    const reviews = await prisma.review.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        createdAt: true,
        isApproved: true,
      },
    });

    // Group by month
    const monthlyData: {
      [key: string]: {
        total: number;
        approved: number;
      }
    } = {};

    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      });
      monthlyData[monthKey] = { total: 0, approved: 0 };
    }

    // Count reviews per month
    reviews.forEach((review: any) => {
      const monthKey = new Date(review.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short'
      });
      if (monthlyData[monthKey] !== undefined) {
        monthlyData[monthKey].total++;
        if (review.isApproved) {
          monthlyData[monthKey].approved++;
        }
      }
    });

    const chartData = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      reviews: data.total,
      approved: data.approved,
      pending: data.total - data.approved,
      _count: data.total,
    }));

    res.json({
      success: true,
      data: {
        monthlyReviews: chartData,
        totalReviews: reviews.length,
        totalApproved: reviews.filter((r: any) => r.isApproved).length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update any nursery
export const updateNurseryAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      phone,
      email,
      city,
      town,
      ageRange,
      facilities,
      fees,
      openingHours,
      aboutUs,
      philosophy,
      cardImage,
      images,
      videoUrl,
    } = req.body;

    // Find nursery
    const nursery = await prisma.nursery.findUnique({
      where: { id },
    });

    if (!nursery) {
      return res.status(404).json({
        success: false,
        message: 'Nursery not found',
      });
    }

    // Generate slug from name if name is updated
    let slug = nursery.slug;
    if (name && name !== nursery.name) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      // Ensure unique slug
      let uniqueSlug = slug;
      let counter = 1;
      while (await prisma.nursery.findFirst({ where: { slug: uniqueSlug, id: { not: id } } })) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
      slug = uniqueSlug;
    }

    // Build update data
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (city !== undefined) updateData.city = city;
    if (town !== undefined) updateData.town = town;
    if (ageRange !== undefined) updateData.ageRange = ageRange;
    if (facilities !== undefined) updateData.facilities = facilities;
    if (fees !== undefined) updateData.fees = fees;
    if (openingHours !== undefined) updateData.openingHours = openingHours;
    if (aboutUs !== undefined) updateData.aboutUs = aboutUs;
    if (philosophy !== undefined) updateData.philosophy = philosophy;
    if (cardImage !== undefined) updateData.cardImage = cardImage;
    if (images !== undefined) updateData.images = images;
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl;

    const updatedNursery = await prisma.nursery.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Nursery updated successfully',
      data: updatedNursery,
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Update any group
export const updateGroupAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      name,
      logo,
      cardImage,
      images,
      aboutUs,
      description,
      city,
      town,
      email,
      phone,
      firstName,
      lastName,
    } = req.body;

    // Find group
    const group = await prisma.group.findUnique({
      where: { id },
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Generate slug from name if name is updated
    let slug = group.slug;
    if (name && name !== group.name) {
      slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      // Ensure unique slug
      let uniqueSlug = slug;
      let counter = 1;
      while (await prisma.group.findFirst({ where: { slug: uniqueSlug, id: { not: id } } })) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
      slug = uniqueSlug;
    }

    // Build update data
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (logo !== undefined) updateData.logo = logo;
    if (cardImage !== undefined) updateData.cardImage = cardImage;
    if (images !== undefined) updateData.images = images;
    if (aboutUs !== undefined) updateData.aboutUs = aboutUs;
    if (description !== undefined) updateData.description = description;
    if (city !== undefined) updateData.city = city;
    if (town !== undefined) updateData.town = town;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;

    const updatedGroup = await prisma.group.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Group updated successfully',
      data: updatedGroup,
    });
  } catch (error) {
    next(error);
  }
};

