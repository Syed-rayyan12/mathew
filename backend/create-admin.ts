import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('Creating admin user...');
    
    const hashedPassword = await bcrypt.hash('Admin@123456', 10);
    
    const admin = await prisma.user.create({
      data: {
        id: 'USR-ADMIN-001',
        email: 'admin@mathew.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@mathew.com');
    console.log('Password: Admin@123456');
    console.log('Please change this password after first login!');
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.log('⚠️ Admin user already exists');
    } else {
      console.error('Error creating admin:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
