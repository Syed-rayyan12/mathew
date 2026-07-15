import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL,
    },
  },
});

async function createAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@mathew.com';
    const password = process.env.ADMIN_PASSWORD;

    if (!password) {
      throw new Error('ADMIN_PASSWORD must be set');
    }

    console.log('Creating or updating admin user...');

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await prisma.user.upsert({
      where: { email },
      create: {
        id: 'USR-ADMIN-001',
        email,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
      },
      update: {
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log(`Admin user ready: ${admin.email}`);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
