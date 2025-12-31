import prisma from '../config/database';

// Generate short IDs like USR0001, NUR0001, GRP0001
export const generateShortId = async (prefix: 'USR' | 'NUR' | 'GRP' | 'REV' | 'ART' | 'SUB'): Promise<string> => {
  // Get initial count from database
  let count = 0;
  switch (prefix) {
    case 'USR':
      count = await prisma.user.count();
      break;
    case 'NUR':
      count = await prisma.nursery.count();
      break;
    case 'GRP':
      count = await prisma.group.count();
      break;
    case 'REV':
      count = await prisma.review.count();
      break;
    case 'ART':
      count = await prisma.article.count();
      break;
    case 'SUB':
      count = await prisma.subscription.count();
      break;
  }

  // Keep trying until we find a unique ID
  let newId = '';
  let exists = true;
  
  while (exists) {
    count++;
    const number = count.toString().padStart(4, '0');
    newId = `${prefix}${number}`;

    // Check if this ID already exists
    let existingRecord = null;
    switch (prefix) {
      case 'USR':
        existingRecord = await prisma.user.findUnique({ where: { id: newId } });
        break;
      case 'NUR':
        existingRecord = await prisma.nursery.findUnique({ where: { id: newId } });
        break;
      case 'GRP':
        existingRecord = await prisma.group.findUnique({ where: { id: newId } });
        break;
      case 'REV':
        existingRecord = await prisma.review.findUnique({ where: { id: newId } });
        break;
      case 'ART':
        existingRecord = await prisma.article.findUnique({ where: { id: newId } });
        break;
      case 'SUB':
        existingRecord = await prisma.subscription.findUnique({ where: { id: newId } });
        break;
    }
    
    exists = existingRecord !== null;
  }

  return newId;
};

// Generate random alphanumeric ID (12-15 chars)
export const generateRandomId = (length: number = 12): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate combined ID: prefix + random string (e.g., USR_abc123def456)
export const generateHybridId = async (prefix: 'USR' | 'NUR' | 'GRP' | 'REV' | 'ART' | 'SUB'): Promise<string> => {
  const randomPart = generateRandomId(10);
  return `${prefix}_${randomPart}`;
};
