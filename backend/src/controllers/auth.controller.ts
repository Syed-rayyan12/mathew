import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { hashPassword, comparePassword, generateTokens, ConflictError, UnauthorizedError, NotFoundError } from '../utils';
import { AuthRequest } from '../middleware';
import { generateShortId } from '../utils/id-generator';
import { createNotification } from './notification.controller';

// User Signup
export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, firstName, lastName, phone, role, address } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Validate role - only allow PARENT, NURSERY_OWNER, USER roles for signup
    const allowedRoles = ['PARENT', 'NURSERY_OWNER', 'USER'];
    const userRole = role && allowedRoles.includes(role) ? role : 'USER';

    // Generate custom short ID
    const userId = await generateShortId('USR');

    // Create user with isActive: false (requires admin approval)
    const user = await prisma.user.create({
      data: {
        id: userId,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        address,
        role: userRole,
        isActive: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        role: true,
        createdAt: true,
      },
    });

    // Create notification for new user signup
    try {
      await createNotification(
        'New User Signup',
        `New ${userRole === 'NURSERY_OWNER' ? 'nursery owner' : 'user'} registered: ${firstName} ${lastName} (${email})`,
        'USER',
        user.id
      );
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError);
      // Don't fail the signup if notification fails
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Your account is pending admin approval. You will be able to login once approved.',
      pendingApproval: true,
      data: {
        user,
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

// User Signin
export const signin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is active (approved by admin)
    if (!user.isActive) {
      throw new UnauthorizedError('Your account is pending admin approval. Please wait for approval before signing in.');
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update user's online status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
      },
    });

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          address: user.address,
          role: user.role,
          isOnline: true,
        },
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { firstName, lastName, phone, avatar, address } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user?.userId },
      data: {
        firstName,
        lastName,
        phone,
        avatar,
        address,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        address: true,
        role: true,
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify that the userId from token matches the user in database
    // This prevents cross-user password updates
    if (user.id !== userId) {
      throw new UnauthorizedError('User ID mismatch - cannot change password for different user');
    }

    const isPasswordValid = await comparePassword(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const hashedPassword = await hashPassword(newPassword);

    // Update ONLY this specific user's password by ID
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Verify the update only affected one record
    if (!updatedUser) {
      throw new Error('Failed to update password');
    }

    console.log(`✅ Password changed successfully for user: ${userId} (role: ${userRole})`);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Nursery Owner Signup
export const nurserySignup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, firstName, lastName, phone, nurseryName, address } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate custom short ID
    const userId = await generateShortId('USR');
    const groupId = await generateShortId('GRP');

    // Parse address for group
    let groupAddress = '';
    let groupCity = '';
    let groupPostcode = '';
    
    if (address) {
      const parts = address.split(',').map((p: string) => p.trim());
      const postcodeRegex = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/i;
      const postcodeIndex = parts.findIndex((part: string) => postcodeRegex.test(part));
      
      if (postcodeIndex !== -1) {
        const postcodeMatch = parts[postcodeIndex].match(postcodeRegex);
        groupPostcode = postcodeMatch ? postcodeMatch[0] : '';
        if (postcodeIndex > 0) groupCity = parts[postcodeIndex - 1];
        if (postcodeIndex > 1) groupAddress = parts.slice(0, postcodeIndex - 1).join(', ');
        else if (postcodeIndex === 1) groupAddress = parts[0];
      } else {
        if (parts.length >= 3) {
          groupAddress = parts.slice(0, -2).join(', ');
          groupCity = parts[parts.length - 2];
        } else if (parts.length === 2) {
          groupAddress = parts[0];
          groupCity = parts[1];
        } else {
          groupAddress = address;
        }
      }
    }

    // Create user and group in a transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Create user with NURSERY_OWNER role
      const user = await tx.user.create({
        data: {
          id: userId,
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          address,
          nurseryName,
          role: 'NURSERY_OWNER',
          isActive: false,
          isOnline: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          nurseryName: true,
          role: true,
          createdAt: true,
        },
      });

      // Create group with signup form info
      const group = await tx.group.create({
        data: {
          id: groupId,
          name: nurseryName,
          slug: nurseryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
          email,
          phone,
          firstName,
          lastName,
          address: groupAddress,
          city: groupCity,
          postcode: groupPostcode,
          ownerId: user.id,
        },
      });

      return { user, group };
    });

    const user = result.user;

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: 'Nursery owner account created successfully! Your account is pending admin approval. You will be able to login once approved.',
      pendingApproval: true,
      data: {
        user,
        ...tokens,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Nursery Owner Signin
export const nurserySignin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      
      include: {
        nurseries: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Check if user is a nursery owner
    if (user.role !== 'NURSERY_OWNER') {
      throw new UnauthorizedError('Access denied. Nursery owner account required.');
    }

    // Check if user is active (approved by admin)
    if (!user.isActive) {
      throw new UnauthorizedError('Your account is pending admin approval. Please wait for approval before signing in.');
    }

    // Validate password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update user's online status and activate their nurseries/groups
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
      },
    });

    // Activate nurseries
    await prisma.nursery.updateMany({
      where: { ownerId: user.id },
      data: { isActive: true },
    });

    // Activate groups
    await prisma.group.updateMany({
      where: { ownerId: user.id },
      data: { isActive: true },
    });

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          address: user.address,
          nurseryName: user.nurseryName || '',
          role: user.role,
          isOnline: true,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Logout - Set user offline and inactive
export const logout = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;

    if (userId) {
      // Get user to check role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      // Update user's online status
      await prisma.user.update({
        where: { id: userId },
        data: {
          isOnline: false,
        },
      });

      // If nursery owner, deactivate their nurseries and groups
      if (user?.role === 'NURSERY_OWNER') {
        await prisma.nursery.updateMany({
          where: { ownerId: userId },
          data: { isActive: false },
        });

        await prisma.group.updateMany({
          where: { ownerId: userId },
          data: { isActive: false },
        });
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Delete Account - Permanently delete user and all associated data
export const deleteAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Get user to check role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // If nursery owner, delete their nurseries and groups first
    if (user.role === 'NURSERY_OWNER') {
      // Delete all reviews for their nurseries
      await prisma.review.deleteMany({
        where: {
          nursery: {
            ownerId: userId
          }
        }
      });

      // Delete all nurseries
      await prisma.nursery.deleteMany({
        where: { ownerId: userId }
      });

      // Delete all groups
      await prisma.group.deleteMany({
        where: { ownerId: userId }
      });
    }

    // Delete user's reviews
    await prisma.review.deleteMany({
      where: { userId }
    });

    // Delete user's shortlist
    await prisma.shortlist.deleteMany({
      where: { userId }
    });

    // Finally, delete the user
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
