import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware';

// Create notification
export const createNotification = async (
  title: string,
  message: string,
  entity: 'USER' | 'NURSERY' | 'GROUP' | 'REVIEW',
  entityId: string
) => {
  try {
    console.log('🔔 Creating notification:', { title, message, entity, entityId });
    
    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        entity,
        entityId,
      },
    });
    
    console.log('✅ Notification created successfully:', notification.id);
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    throw error;
  }
};

// Get all notifications (admin only)
export const getAllNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 20, isRead } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    console.log('📋 Fetching notifications:', { page, limit, isRead, skip, where });

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    console.log(`✅ Found ${notifications.length} notifications out of ${total} total`);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get recent notifications (for header dropdown)
export const getRecentNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { limit = 10 } = req.query;

    console.log('📬 Fetching recent notifications:', { limit });

    const notifications = await prisma.notification.findMany({
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
    });

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: { isRead: false },
    });

    console.log(`✅ Found ${notifications.length} recent notifications, ${unreadCount} unread`);

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
export const markAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// Mark all notifications as read
export const markAllAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        updatedCount: result.count,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete notification
export const deleteNotification = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.notification.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    next(error);
  }
};

// Clear all notifications
export const clearAllNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await prisma.notification.deleteMany({});

    res.json({
      success: true,
      message: 'All notifications cleared',
      data: {
        deletedCount: result.count,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get notification statistics
export const getNotificationStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const [total, unread, byEntity] = await Promise.all([
      prisma.notification.count(),
      prisma.notification.count({ where: { isRead: false } }),
      prisma.notification.groupBy({
        by: ['entity'],
        _count: true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        unread,
        byEntity: byEntity.map((item: any) => ({
          entity: item.entity,
          count: item._count,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
