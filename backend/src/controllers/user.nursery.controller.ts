import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { NotFoundError } from '../utils';

// Get all nursery groups (public - for nursery-group page)
export const getAllGroups = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const groups = await prisma.group.findMany({
      where: { 
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        slug: true,
        cardImage: true,
        logo: true,
        aboutUs: true,
        description: true,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: groups,
    });
  } catch (error) {
    next(error);
  }
};

// Get group by slug (public - for nursery-group/[slug] page)
export const getGroupBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;

    const group = await prisma.group.findFirst({
      where: { 
        slug,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        city: true,
        logo: true,
        cardImage: true,
        images: true,
        aboutUs: true,
        isActive: true,
      },
    });

    if (!group) {
      throw new NotFoundError('Group not found');
    }

    res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

// Autocomplete search for hero banner (search cities, groups, and nurseries)
export const autocompleteSearch = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.json({
        success: true,
        data: {
          cities: [],
          groups: [],
          nurseries: [],
        },
      });
    }

    const searchTerm = query.trim();

    // Search for matching groups
    const groups = await prisma.group.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { city: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        cardImage: true,
      },
      take: 5,
    });

    // Search for matching nurseries
    const nurseries = await prisma.nursery.findMany({
      where: {
        isApproved: true,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { city: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        cardImage: true,
        group: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      take: 5,
    });

    // Get matching cities from UK_CITIES
    const UK_CITIES = [
      "Aberdeen", "Bath", "Belfast", "Birmingham", "Blackpool", "Bournemouth",
      "Bradford", "Brighton", "Bristol", "Cambridge", "Canterbury", "Cardiff",
      "Carlisle", "Chelmsford", "Chester", "Chichester", "Colchester", "Coventry",
      "Derby", "Doncaster", "Dundee", "Durham", "Edinburgh", "Exeter",
      "Glasgow", "Gloucester", "Hereford", "Inverness", "Kingston upon Hull",
      "Lancaster", "Leeds", "Leicester", "Lichfield", "Lincoln", "Liverpool",
      "London", "Londonderry", "Luton", "Manchester", "Middlesbrough", "Milton Keynes",
      "Newcastle upon Tyne", "Newport", "Newry", "Northampton", "Norwich", "Nottingham",
      "Oxford", "Perth", "Peterborough", "Plymouth", "Portsmouth", "Preston",
      "Reading", "Ripon", "Salford", "Salisbury", "Sheffield", "Southampton",
      "Southend-on-Sea", "St Albans", "St Asaph", "St Davids", "Stirling", "Stoke-on-Trent",
      "Sunderland", "Swansea", "Swindon", "Truro", "Wakefield", "Wells",
      "Westminster", "Winchester", "Wolverhampton", "Worcester", "York"
    ];
    
    const cities = UK_CITIES.filter(city => 
      city.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);

    res.json({
      success: true,
      data: {
        cities,
        groups,
        nurseries,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Search nurseries for review submission (search by name, postcode, city)
export const searchNurseries = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.json({
        success: true,
        data: [],
      });
    }

    const nurseries = await prisma.nursery.findMany({
      where: {
        isApproved: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { city: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
      },
      take: 10,
    });

    res.json({
      success: true,
      data: nurseries,
    });
  } catch (error) {
    next(error);
  }
};

// Search by city for hero banner (returns 2 groups + 2 nurseries)
export const searchByCity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { city } = req.query;

    if (!city || typeof city !== 'string') {
      return res.json({
        success: true,
        data: {
          groups: [],
          nurseries: [],
        },
      });
    }

    // Get 2 groups in the city
    const groups = await prisma.group.findMany({
      where: {
        isActive: true,
        city: { equals: city, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        cardImage: true,
        logo: true,
        description: true,
        _count: {
          select: {
            nurseries: {
              where: {
                isApproved: true
              }
            }
          }
        }
      },
      take: 2,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get 2 nurseries in the city
    const nurseries = await prisma.nursery.findMany({
      where: {
        isApproved: true,
        city: { equals: city, mode: 'insensitive' },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        cardImage: true,
        description: true,
        ageRange: true,
        facilities: true,
        group: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      take: 2,
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: {
        groups: groups.map(group => ({
          ...group,
          nurseryCount: group._count.nurseries
        })),
        nurseries,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all approved nurseries (for public viewing on website)
export const getAllNurseries = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { city, search, page = 1, limit = 100, ageRange, facilities } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      isApproved: true,
    };

    if (city) {
      where.city = { contains: city as string, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Filter by age range
    if (ageRange) {
      const ageRanges = Array.isArray(ageRange) ? ageRange : [ageRange];
      where.ageRange = {
        in: ageRanges,
      };
    }

    // Filter by facilities
    if (facilities) {
      const facilityList = Array.isArray(facilities) ? facilities : [facilities];
      // Check if nursery has all selected facilities
      where.facilities = {
        hasEvery: facilityList,
      };
    }

    const [nurseries, total] = await Promise.all([
      prisma.nursery.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          group: {
            select: {
              id: true,
              name: true,
              slug: true,
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
        orderBy: { createdAt: 'desc' },
      }),
      prisma.nursery.count({ where }),
    ]);

    // Calculate average rating for each nursery
    const nurseriesWithRatings = nurseries.map(nursery => {
      const approvedReviews = nursery.reviews;
      const averageRating = approvedReviews.length > 0
        ? approvedReviews.reduce((sum, r) => sum + r.overallRating, 0) / approvedReviews.length
        : 0;

      const { reviews, ...nurseryData } = nursery;
      return {
        ...nurseryData,
        averageRating: Math.round(averageRating * 10) / 10,
      };
    });

    res.json({
      success: true,
      data: nurseriesWithRatings,
      count: total,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get single nursery by slug (for public viewing)
export const getNurseryBySlug = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { slug } = req.params;
    
    console.log('🔍 Searching for nursery with slug:', slug);

    const nursery = await prisma.nursery.findUnique({
      where: { slug },
      include: {
        owner: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        reviews: {
          where: { isApproved: true },
          include: {
            user: {
              select: { firstName: true, lastName: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { reviews: true },
        },
      },
    });

    console.log('🎯 Found nursery:', nursery ? 'YES' : 'NO');
    console.log('🔐 Nursery approved:', nursery?.isApproved);
    
    if (!nursery) {
      console.log('❌ Nursery not found with slug:', slug);
      
      // Check all nurseries to debug
      const allNurseries = await prisma.nursery.findMany({
        select: { name: true, slug: true, isApproved: true },
        take: 5,
      });
      console.log('📋 Available nurseries:', allNurseries);
      
      throw new NotFoundError('Nursery not found');
    }
    
    // Check if approved (for public viewing, we may want only approved nurseries)
    // Commenting out for now to allow viewing unapproved nurseries for testing
    // if (!nursery.isApproved) {
    //   throw new NotFoundError('Nursery not approved');
    // }

    // Calculate average rating
    const approvedReviews = nursery.reviews || [];
    const averageRating = approvedReviews.length > 0
      ? approvedReviews.reduce((sum, r) => sum + r.overallRating, 0) / approvedReviews.length
      : 0;

    res.json({
      success: true,
      data: {
        ...nursery,
        averageRating: Math.round(averageRating * 10) / 10,
      },
    });
  } catch (error) {
    console.error('❌ Error in getNurseryBySlug:', error);
    next(error);
  }
};
