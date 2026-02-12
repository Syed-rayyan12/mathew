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
          { town: { contains: searchTerm, mode: 'insensitive' } },
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
          { town: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        town: true,
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
      "Aberdeen", "Armagh", "Bangor", "Bath", "Belfast", "Birmingham", "Bradford", 
      "Brighton and Hove", "Bristol", "Cambridge", "Canterbury", "Cardiff", "Carlisle", 
      "Chelmsford", "Chester", "Chichester", "Colchester", "Coventry", "Derby", "Doncaster", 
      "Dundee", "Dunfermline", "Durham", "Edinburgh", "Ely", "Exeter", "Glasgow", 
      "Gloucester", "Hereford", "Inverness", "Kingston upon Hull", "Lancaster", "Leeds", 
      "Leicester", "Lichfield", "Lincoln", "Lisburn", "Liverpool", "London", "Londonderry", 
      "Manchester", "Milton Keynes", "Newcastle upon Tyne", "Newport", "Newry", "Norwich", 
      "Nottingham", "Oxford", "Perth", "Peterborough", "Plymouth", "Portsmouth", "Preston", 
      "Ripon", "Salford", "Salisbury", "Sheffield", "Southampton", "Southend-on-Sea", 
      "St Albans", "St Asaph (Llanelwy)", "St Davids", "Stirling", "Stoke-on-Trent", 
      "Sunderland", "Swansea", "Truro", "Wakefield", "Wells", "Westminster", "Winchester", 
      "Wolverhampton", "Worcester", "Wrexham", "York"
    ];
    
    const UK_TOWNS = [
      "Abingdon", "Accrington", "Aldershot", "Alfreton", "Alloa", "Altrincham", "Amersham",
      "Andover", "Arbroath", "Ashford", "Ashington", "Ashton-under-Lyne", "Aylesbury", "Ayr",
      "Banbury", "Banstead", "Barnsley", "Barnstaple", "Barrow-in-Furness", "Barry", "Basildon",
      "Basingstoke", "Bathgate", "Batley", "Beaconsfield", "Bebington", "Bedford", "Bellshill",
      "Belper", "Berwick-upon-Tweed", "Beverley", "Bexhill-on-Sea", "Bicester", "Bideford",
      "Billericay", "Billingham", "Birkenhead", "Bishop Auckland", "Bishop's Stortford", "Blackburn",
      "Blackpool", "Blyth", "Bodmin", "Bognor Regis", "Bolton", "Bootle", "Borehamwood",
      "Boston", "Bournemouth", "Bracknell", "Braintree", "Brentwood", "Bridgwater", "Bridlington",
      "Bridport", "Brigg", "Brighouse", "Broadstairs", "Bromley", "Bromsgrove", "Brownhills",
      "Buckingham", "Burgess Hill", "Burnley", "Burton upon Trent", "Bury", "Bury St Edmunds",
      "Buxton", "Camberley", "Camborne", "Cambuslang", "Cannock", "Canvey Island", "Carluke",
      "Carnforth", "Carrickfergus", "Carshalton", "Castleford", "Caterham", "Chatham", "Cheadle",
      "Cheltenham", "Chepstow", "Chertsey", "Chesham", "Cheshunt", "Chester-le-Street", "Chesterfield",
      "Chippenham", "Chipping Sodbury", "Chorley", "Christchurch", "Cinderford", "Cirencester",
      "Clacton-on-Sea", "Cleethorpes", "Clevedon", "Clitheroe", "Clydebank", "Coatbridge",
      "Cockermouth", "Colne", "Colwyn Bay", "Congleton", "Consett", "Corby", "Cowdenbeath",
      "Cramlington", "Crawley", "Crewe", "Cromer", "Crowborough", "Croydon", "Cumbernauld",
      "Cwmbran", "Dagenham", "Dalkeith", "Darlington", "Dartford", "Daventry", "Dawlish",
      "Deal", "Denbigh", "Denton", "Dewsbury", "Didcot", "Dingwall", "Doncaster", "Dorchester",
      "Dorking", "Dover", "Downpatrick", "Driffield", "Droitwich", "Dromore", "Dumbarton",
      "Dumfries", "Dunbar", "Dunstable", "Durham", "Eastbourne", "Eastleigh", "Ebbw Vale",
      "Eccles", "Edenbridge", "Egham", "Elgin", "Ellesmere Port", "Ely", "Enniskillen",
      "Epping", "Epsom", "Erith", "Esher", "Evesham", "Exeter", "Exmouth", "Failsworth",
      "Falkirk", "Falmouth", "Fareham", "Farnborough", "Farnham", "Farnworth", "Faversham",
      "Felixstowe", "Ferryhill", "Filey", "Fleetwood", "Folkestone", "Formby", "Fraserburgh",
      "Frome", "Gainsborough", "Galashiels", "Gateshead", "Gillingham", "Girvan", "Glastonbury",
      "Glenrothes", "Glossop", "Godalming", "Golborne", "Goole", "Gosport", "Govan",
      "Grangemouth", "Grantham", "Gravesend", "Grays", "Greenock", "Gretna", "Grimsby",
      "Guisborough", "Hadleigh", "Hailsham", "Halesowen", "Halifax", "Hamilton", "Harlow",
      "Harpenden", "Harrogate", "Harrow", "Hartlepool", "Harwich", "Haslemere", "Haslingden",
      "Hastings", "Hatfield", "Havant", "Haverfordwest", "Haverhill", "Hawick", "Haxby",
      "Hayes", "Hayle", "Haywards Heath", "Heanor", "Hebburn", "Heckmondwike", "Helensburgh",
      "Helston", "Hemel Hempstead", "Henley-on-Thames", "Herne Bay", "Hertford", "Hessle",
      "Heswall", "Hexham", "Heywood", "High Wycombe", "Hinckley", "Hitchin", "Hoddesdon",
      "Holmfirth", "Holyhead", "Honiton", "Horley", "Hornchurch", "Hornsea", "Horsham",
      "Houghton-le-Spring", "Hove", "Huddersfield", "Hunstanton", "Huntingdon", "Hyde",
      "Hythe", "Ilford", "Ilfracombe", "Ilkeston", "Ilkley", "Immingham", "Inverurie",
      "Irvine", "Ivybridge", "Jarrow", "Johnstone", "Keighley", "Keith", "Kelso",
      "Kendal", "Kenilworth", "Keswick", "Kettering", "Keynsham", "Kidderminster", "Kilmarnock",
      "Kilwinning", "King's Lynn", "Kingsbridge", "Kingston upon Thames", "Kingswood", "Kirkby",
      "Kirkby in Ashfield", "Kirkcaldy", "Kirkham", "Kirkintilloch", "Knaresborough", "Knottingley",
      "Knutsford", "Lancing", "Lanark", "Largs", "Larkhall", "Larne", "Launceston",
      "Leamington Spa", "Leatherhead", "Ledbury", "Lee-on-the-Solent", "Leek", "Leigh",
      "Leigh-on-Sea", "Leighton Buzzard", "Leominster", "Lerwick", "Letchworth", "Leven",
      "Lewes", "Leyburn", "Leyland", "Lichfield", "Limavady", "Lincoln", "Linlithgow",
      "Lisburn", "Liskeard", "Littlehampton", "Liverpool", "Livingston", "Llanelli", "Llandudno",
      "Lochgelly", "Loftus", "Long Eaton", "Longridge", "Looe", "Lossiemouth", "Loughborough",
      "Loughton", "Louth", "Lowestoft", "Ludlow", "Lurgan", "Luton", "Lydney",
      "Lyme Regis", "Lymington", "Lytham St Annes", "Mablethorpe", "Macclesfield", "Maesteg",
      "Maghull", "Maidenhead", "Maidstone", "Maldon", "Malton", "Malvern", "Mansfield",
      "March", "Margate", "Market Harborough", "Marlborough", "Marlow", "Maryport", "Matlock",
      "Melton Mowbray", "Merthyr Tydfil", "Mexborough", "Middleton", "Middlewich", "Midhurst",
      "Midsomer Norton", "Millom", "Milngavie", "Minehead", "Mirfield", "Mitcham", "Mold",
      "Monmouth", "Montrose", "Morecambe", "Morley", "Morpeth", "Mossley", "Motherwell",
      "Mountain Ash", "Nantwich", "Neath", "Nelson", "Neston", "Newark-on-Trent", "Newbury",
      "Newcastle-under-Lyme", "Newhaven", "Newmarket", "Newport", "Newport Pagnell", "Newquay",
      "Newton Abbot", "Newton Aycliffe", "Newton Mearns", "Newtownabbey", "Newtownards", "Normanton",
      "North Berwick", "North Shields", "North Walsham", "Northallerton", "Northampton", "Northfleet",
      "Northwich", "Norwich", "Nuneaton", "Oadby", "Oakham", "Oban", "Okehampton",
      "Oldbury", "Oldham", "Omagh", "Ormskirk", "Orpington", "Ossett", "Oswestry",
      "Otley", "Oundle", "Oxford", "Oxted", "Paignton", "Paisley", "Peacehaven",
      "Peebles", "Penarth", "Penicuik", "Penistone", "Penrith", "Penryn", "Penzance",
      "Pershore", "Perth", "Peterborough", "Peterhead", "Peterlee", "Petersfield", "Pickering",
      "Pinner", "Pitlochry", "Plymouth", "Pocklington", "Pontefract", "Pontypridd", "Poole",
      "Port Glasgow", "Port Talbot", "Portadown", "Porthcawl", "Portishead", "Portlethen",
      "Portrush", "Portslade", "Portstewart", "Potters Bar", "Poulton-le-Fylde", "Prescot",
      "Prestatyn", "Prestwick", "Prudhoe", "Pudsey", "Pwllheli", "Queenborough", "Queensferry",
      "Ramsgate", "Ramsbottom", "Raunds", "Rawtenstall", "Rayleigh", "Reading", "Redcar",
      "Redditch", "Redhill", "Redruth", "Reigate", "Renfrew", "Retford", "Rhondda",
      "Rhyl", "Richmond", "Rickmansworth", "Ringwood", "Ripley", "Ripon", "Risca",
      "Rochdale", "Rochester", "Rochford", "Romford", "Romsey", "Ross-on-Wye", "Rotherham",
      "Rothesay", "Rottingdean", "Rowley Regis", "Royal Tunbridge Wells", "Royston", "Royton",
      "Rugby", "Rugeley", "Runcorn", "Rushden", "Rustington", "Rutherglen", "Ruthin",
      "Ryde", "Rye", "Ryton", "Saffron Walden", "St Andrews", "St Austell", "St Helens",
      "St Ives", "St Neots", "Sale", "Salford", "Saltash", "Saltburn-by-the-Sea", "Saltcoats",
      "Sandbach", "Sandown", "Sandwich", "Sandy", "Sawbridgeworth", "Scarborough", "Scunthorpe",
      "Seaford", "Seaham", "Seaton", "Sedgefield", "Selby", "Selkirk", "Settle",
      "Sevenoaks", "Shaftesbury", "Shanklin", "Sheerness", "Sheffield", "Shepshed", "Shepton Mallet",
      "Sherborne", "Sheringham", "Shildon", "Shipley", "Shoreham-by-Sea", "Shrewsbury", "Sidcup",
      "Sidmouth", "Sittingbourne", "Skegness", "Skelmersdale", "Skipton", "Sleaford", "Slough",
      "Smethwick", "Snodland", "Soham", "Solihull", "Somerton", "South Shields", "Southall",
      "Southam", "Southampton", "Southend-on-Sea", "Southport", "Southsea", "Southwell", "Southwick",
      "Southwold", "Sowerby Bridge", "Spalding", "Spennymoor", "Stafford", "Staines-upon-Thames",
      "Stalybridge", "Stamford", "Stanford-le-Hope", "Stanley", "Stansted Mountfitchet", "Staveley",
      "Stevenage", "Stevenston", "Stewarton", "Stirling", "Stockport", "Stocksbridge",
      "Stockton-on-Tees", "Stoke-on-Trent", "Stone", "Stonehaven", "Stonehouse", "Stourbridge",
      "Stourport-on-Severn", "Stowmarket", "Stranraer", "Stratford-upon-Avon", "Strathaven",
      "Street", "Strood", "Stroud", "Sudbury", "Sunderland", "Surbiton", "Sutton",
      "Sutton Coldfield", "Sutton in Ashfield", "Swadlincote", "Swaffham", "Swanage", "Swanley",
      "Swansea", "Swindon", "Swinton", "Tadcaster", "Tain", "Tamworth", "Taunton",
      "Tavistock", "Teignmouth", "Telford", "Tenby", "Tenterden", "Tewkesbury", "Thame",
      "Thatcham", "Thetford", "Thirsk", "Thornaby", "Thornbury", "Thorne", "Tiverton",
      "Todmorden", "Tonbridge", "Torpoint", "Torquay", "Totnes", "Tottenham", "Totton",
      "Towcester", "Tredegar", "Tring", "Troon", "Trowbridge", "Truro", "Twickenham",
      "Tyldesley", "Tynemouth", "Uckfield", "Ulverston", "Upminster", "Urmston", "Uttoxeter",
      "Uxbridge", "Ventnor", "Wadebridge", "Wakefield", "Wallasey", "Wallingford", "Wallsend",
      "Walsall", "Waltham Abbey", "Waltham Cross", "Walthamstow", "Walton-on-Thames", "Wantage",
      "Ware", "Wareham", "Warminster", "Warrington", "Warwick", "Washington", "Waterlooville",
      "Watford", "Wath-upon-Dearne", "Wednesbury", "Wednesfield", "Wellingborough", "Wellington",
      "Wells-next-the-Sea", "Welshpool", "Welwyn Garden City", "Wem", "Wembley", "West Bridgford",
      "West Bromwich", "Westcliff-on-Sea", "Westhoughton", "Weston-super-Mare", "Wetherby",
      "Weybridge", "Weymouth", "Whitby", "Whitchurch", "Whitehaven", "Whitley Bay", "Whitstable",
      "Whittlesey", "Whitworth", "Wick", "Wickford", "Widnes", "Wigan", "Wigston",
      "Willenhall", "Wilmslow", "Wimborne Minster", "Wincanton", "Winchester", "Windermere",
      "Windsor", "Winsford", "Wisbech", "Witham", "Withernsea", "Witney", "Wiveliscombe",
      "Woking", "Wokingham", "Wolverhampton", "Wombwell", "Woodbridge", "Worcester", "Workington",
      "Worksop", "Worthing", "Wotton-under-Edge", "Wrexham", "Wymondham", "Yarm", "Yate",
      "Yateley", "Yeovil"
    ];
    
    const cities = UK_CITIES.filter(city => 
      city.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);

    const towns = UK_TOWNS.filter(town => 
      town.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 10);

    res.json({
      success: true,
      data: {
        cities,
        towns,
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
        data: {
          nurseries: [],
          groups: [],
          cities: [],
          towns: [],
        },
      });
    }

    const searchTerm = query.toLowerCase().trim();

    // Search nurseries
    const nurseries = await prisma.nursery.findMany({
      where: {
        isApproved: true,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { city: { contains: searchTerm, mode: 'insensitive' } },
          { town: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        town: true,
        cardImage: true,
        group: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      take: 10,
    });

    // Search groups 
    const groups = await prisma.group.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { city: { contains: searchTerm, mode: 'insensitive' } },
          { town: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        cardImage: true,
      },
      take: 10,
    });

    // Extract unique cities and towns
    const cities = Array.from(
      new Set([
        ...nurseries.map(n => n.city).filter(Boolean),
        ...groups.map(g => g.city).filter(Boolean),
      ])
    );

    const towns = Array.from(
      new Set(nurseries.map(n => n.town).filter(Boolean))
    );

    res.json({
      success: true,
      data: {
        nurseries,
        groups,
        cities,
        towns,
      },
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
        town: true,
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
        town: true,
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
