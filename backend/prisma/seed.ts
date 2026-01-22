import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const Role = {
  ADMIN: 'ADMIN',
  NURSERY_OWNER: 'NURSERY_OWNER',
  PARENT: 'PARENT',
  USER: 'USER'
} as const;

const ArticleCategory = {
  CHILDCARE_TIPS: 'CHILDCARE_TIPS',
  FUNDING_COSTS: 'FUNDING_COSTS',
  ACTIVITIES_LEARNING: 'ACTIVITIES_LEARNING',
  NURSERY_UPDATES: 'NURSERY_UPDATES'
} as const;

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  await prisma.shortlist.deleteMany();
  await prisma.review.deleteMany();
  await prisma.nursery.deleteMany();
  await prisma.group.deleteMany();
  await prisma.article.deleteMany();
  await prisma.contactSubmission.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️ Cleared existing data');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@nursery.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      isVerified: true,
    },
  });
  console.log('👤 Created admin user');

  // Create parent users
  const parentPassword = await bcrypt.hash('parent123', 10);
  const parentUser = await prisma.user.create({
    data: {
      email: 'parent@example.com',
      password: parentPassword,
      firstName: 'John',
      lastName: 'Doe',
      phone: '+44 123 456 7890',
      role: Role.PARENT,
      isVerified: true,
    },
  });
  console.log('👤 Created parent user');

  // Create nursery owner
  const ownerPassword = await bcrypt.hash('owner123', 10);
  const nurseryOwner = await prisma.user.create({
    data: {
      email: 'owner@sunshine-nursery.com',
      password: ownerPassword,
      firstName: 'Sarah',
      lastName: 'Smith',
      phone: '+44 987 654 3210',
      role: Role.NURSERY_OWNER,
      isVerified: true,
    },
  });
  console.log('👤 Created nursery owner');

  // Create nursery group
  const nurseryGroup = await prisma.group.create({
    data: {
      name: 'Bright Beginnings Group',
      slug: 'bright-beginnings-group',
      description: 'Award-winning nursery group with over 15 years of experience in early years education.',
      ownerId: nurseryOwner.id, // Assuming owner is set, but in schema it's required
    },
  });
  console.log('🏢 Created nursery group');

  // Create nursery
  const nursery = await prisma.nursery.create({
    data: {
      name: 'Sunshine Nursery',
      slug: 'sunshine-nursery',
      description: 'A warm and welcoming nursery providing exceptional care for children aged 3 months to 5 years.',
      city: 'London',
      phone: '+44 (800) NURSERY',
      email: 'info@sunshine-nursery.com',
      website: 'https://sunshine-nursery.com',
      reviewCount: 25,
      isVerified: true,
      isApproved: true,
      ageRange: '3 months - 5 years',
      capacity: 50,
      facilities: ['Outdoor Play Area', 'Sensory Room', 'Library Corner', 'Music Room'],
      openingHours: {
        monday: { open: '07:30', close: '18:00' },
        tuesday: { open: '07:30', close: '18:00' },
        wednesday: { open: '07:30', close: '18:00' },
        thursday: { open: '07:30', close: '18:00' },
        friday: { open: '07:30', close: '18:00' },
        saturday: { open: null, close: null },
        sunday: { open: null, close: null },
      },
      fees: {
        fullDay: 75,
        halfDay: 45,
        hourly: 10,
      },
      ownerId: nurseryOwner.id,
      groupId: nurseryGroup.id,
    },
  });
  console.log('🏫 Created nursery');

  // Create reviews
  await prisma.review.create({
    data: {
      title: 'Excellent nursery!',
      content: 'My child loves going to this nursery. The staff are caring and professional.',
      overallRating: 5,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      isApproved: true,
      userId: parentUser.id,
      nurseryId: nursery.id,
    },
  });
  console.log('⭐ Created reviews');

  // Create articles
  const articles = [
    {
      name: 'Tips for Choosing the Right Nursery',
      cardHeading: 'Tips for Choosing the Right Nursery',
      cardParagraph: 'A comprehensive guide to finding the perfect nursery.',
      slug: 'tips-for-choosing-right-nursery',
      sections: [{ heading: 'Introduction', paragraph: 'Discover what really matters when selecting a nursery for your little one...' }],
      category: ArticleCategory.CHILDCARE_TIPS,
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      name: 'Understanding Early Years Funding',
      cardHeading: 'Understanding Early Years Funding',
      cardParagraph: 'Navigate the world of childcare funding.',
      slug: 'understanding-early-years-funding',
      sections: [{ heading: 'Introduction', paragraph: 'Everything you need to know about nursery funding options in the UK...' }],
      category: ArticleCategory.FUNDING_COSTS,
      isPublished: true,
      publishedAt: new Date(),
    },
    {
      name: 'Creative Learning Activities for Toddlers',
      cardHeading: 'Creative Learning Activities for Toddlers',
      cardParagraph: 'Engage your child with these creative activities.',
      slug: 'creative-learning-activities-toddlers',
      sections: [{ heading: 'Introduction', paragraph: 'Fun and educational activities to support your toddler\'s development...' }],
      category: ArticleCategory.ACTIVITIES_LEARNING,
      isPublished: true,
      publishedAt: new Date(),
    },
  ];

  await prisma.article.createMany({ data: articles });
  console.log('📰 Created articles');

  // Create subscriptions
  const subscriptions = [
    {
      name: 'Basic',
      price: 0,
      duration: 1,
      features: ['Basic listing', 'Up to 5 photos', 'Contact form'],
      isActive: true,
    },
    {
      name: 'Professional',
      price: 29.99,
      duration: 1,
      features: ['Featured listing', 'Unlimited photos', 'Priority support', 'Analytics dashboard'],
      isActive: true,
    },
    {
      name: 'Enterprise',
      price: 99.99,
      duration: 1,
      features: ['Premium placement', 'Unlimited photos', '24/7 support', 'Advanced analytics', 'API access'],
      isActive: true,
    },
  ];

  await prisma.subscription.createMany({ data: subscriptions });
  console.log('💳 Created subscriptions');

  console.log('✅ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
