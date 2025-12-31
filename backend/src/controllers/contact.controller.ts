import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { createNotification } from './notification.controller';

export const submitContact = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;

    const submission = await prisma.contactSubmission.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        message,
      },
    });

    // Create notification for contact submission
    try {
      await createNotification(
        'New Contact Message',
        `${firstName} ${lastName} (${email}) sent a message: "${message.substring(0, 50)}..."`,
        'USER',
        submission.id
      );
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully',
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllContacts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { page = 1, limit = 10, isRead } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const [contacts, total] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.contactSubmission.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        contacts,
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

export const markContactAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contactSubmission.update({
      where: { id },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: 'Contact marked as read',
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteContact = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    await prisma.contactSubmission.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Contact deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
