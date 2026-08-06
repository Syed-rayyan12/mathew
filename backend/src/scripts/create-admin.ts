/**
 * Creates or updates the admin account.
 *
 * Admin used to be two constants compiled into admin.controller.ts, which put
 * the production password in a public repository. It is now an ordinary User
 * row with role ADMIN, so it can use the password and email endpoints every
 * other account uses — and so it can have its password changed without a
 * deploy.
 *
 * Credentials come from the environment and are never written to git, printed,
 * or logged. Run once, change the password in the admin settings page, then
 * remove ADMIN_INITIAL_PASSWORD from the environment.
 *
 *   ADMIN_EMAIL=you@example.com \
 *   ADMIN_INITIAL_PASSWORD='...' \
 *   DATABASE_URL='...' \
 *   npx ts-node src/scripts/create-admin.ts
 *
 * Safe to re-run: it resets the password of the existing admin rather than
 * creating a second one.
 */

import prisma from '../config/database';
import { hashPassword } from '../utils';

/** Long enough that the fixed-credential era cannot repeat by accident. */
const MIN_PASSWORD_LENGTH = 12;

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!email) throw new Error('ADMIN_EMAIL is not set.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL is not a valid email address.');
  }
  if (!password) throw new Error('ADMIN_INITIAL_PASSWORD is not set.');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`ADMIN_INITIAL_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password === 'Admin@123456') {
    throw new Error('That is the old hardcoded password, which is public. Choose another.');
  }

  const hashed = await hashPassword(password);

  // An account may already exist at this address as a parent or nursery owner.
  // Promoting it would hand admin to whoever already holds that password, so
  // refuse rather than guess.
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (existing && existing.role !== 'ADMIN') {
    throw new Error(
      `${email} already exists with role ${existing.role}. Refusing to promote it — ` +
        'use an address that is not already a parent or nursery account.'
    );
  }

  const admin = await prisma.user.upsert({
    where: { email },
    update: { password: hashed, role: 'ADMIN', isActive: true, isVerified: true },
    create: {
      email,
      password: hashed,
      firstName: 'Site',
      lastName: 'Admin',
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
    },
    select: { id: true, email: true, role: true },
  });

  const others = await prisma.user.count({ where: { role: 'ADMIN' } });

  console.log(`✅ Admin ready: ${admin.email} (id ${admin.id}, role ${admin.role})`);
  console.log(`   Admin accounts now: ${others}`);
  if (others < 2) {
    console.log(
      '   ⚠️  Only one admin exists and there is no password recovery yet.\n' +
        '      Forgetting this password means editing the database to get back in.\n' +
        '      Consider running this again with a second address.'
    );
  }
  console.log('   Now change the password in the admin settings page, then remove');
  console.log('   ADMIN_INITIAL_PASSWORD from the environment.');
}

main()
  .catch((err) => {
    console.error(`❌ ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
