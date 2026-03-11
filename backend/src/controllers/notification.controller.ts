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

// Submit support request from parent dashboard — creates admin notification
export const submitSupportRequest = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, phone, message } = req.body;
    const userId = req.user!.userId;

    if (!email || !message) {
      res.status(400).json({ success: false, message: 'Email and message are required' });
      return;
    }

    await prisma.notification.create({
      data: {
        title: 'Support Request',
        message: `From: ${email}${phone ? ` | Phone: ${phone}` : ''}\n\n${message}`,
        entity: 'USER',
        entityId: userId,
      },
    });

    res.json({ success: true, message: 'Support request sent successfully' });
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

// ─── User (Parent) specific handler ─────────────────────────────────────────
// Shows only USER entity notifications where entityId = logged-in user's own ID
export const getUserNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { limit = 10 } = req.query;

    const where = {
      entity: 'USER' as any,
      entityId: userId,
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);

    res.json({
      success: true,
      data: { notifications, unreadCount },
    });
  } catch (error) {
    next(error);
  }
};

// Mark user notification as read (only own notifications)
export const markUserNotificationAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, entity: 'USER' as any, entityId: userId },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await prisma.notification.update({ where: { id }, data: { isRead: true } });

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};

// ─── Nursery-specific handlers ───────────────────────────────────────────────
// Notifications for nursery dashboard: only REVIEW and NURSERY entities
// where entityId is one of the nurseries owned by the logged-in nursery owner.

// Get nursery notifications (for nursery dashboard bell / dropdown)
export const getNurseryNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { limit = 10 } = req.query;

    // Get all nursery IDs owned by this user
    const ownedNurseries = await prisma.nursery.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const nurseryIds = ownedNurseries.map((n) => n.id);

    console.log('🔔 getNurseryNotifications → userId:', userId);
    console.log('🔔 getNurseryNotifications → nurseryIds:', nurseryIds);

    if (nurseryIds.length === 0) {
      return res.json({
        success: true,
        data: { notifications: [], unreadCount: 0 },
      });
    }

    const where = {
      entity: { in: ['NURSERY', 'REVIEW'] as any },
      entityId: { in: nurseryIds },
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);

    res.json({
      success: true,
      data: { notifications, unreadCount },
    });
  } catch (error) {
    next(error);
  }
};

// Mark nursery notification as read (only if it belongs to one of the owner's nurseries)
export const markNurseryNotificationAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Verify this notification belongs to one of the owner's nurseries
    const ownedNurseries = await prisma.nursery.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const nurseryIds = ownedNurseries.map((n) => n.id);

    const notification = await prisma.notification.findFirst({
      where: {
        id,
        entity: { in: ['NURSERY', 'REVIEW'] as any },
        entityId: { in: nurseryIds },
      },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await prisma.notification.update({ where: { id }, data: { isRead: true } });

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
};
