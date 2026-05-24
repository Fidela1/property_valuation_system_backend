// services/property.service.ts
import prisma from '../config/prisma';

export const getPublishedProperties = async (options: {
  page?: number;
  limit?: number;
  search?: string;
  district?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
}) => {
  const page = options?.page || 1;
  const limit = options?.limit || 12;
  const skip = (page - 1) * limit;
  
  const where: any = {
    status: 'APPROVED'
  };
  
  if (options?.search) {
    where.OR = [
      { upiNumber: { contains: options.search, mode: 'insensitive' } },
      { ownerName: { contains: options.search, mode: 'insensitive' } },
      { district: { contains: options.search, mode: 'insensitive' } }
    ];
  }
  
  if (options?.district && options.district !== 'all') {
    where.district = options.district;
  }
  
  if (options?.propertyType && options.propertyType !== 'all') {
    where.fieldData = {
      propertyType: options.propertyType.toUpperCase()
    };
  }
  
  if (options?.minPrice || options?.maxPrice) {
    where.aiValuation = {};
    if (options.minPrice) where.aiValuation.gte = options.minPrice;
    if (options.maxPrice) where.aiValuation.lte = options.maxPrice;
  }
  
  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        upiNumber: true,
        ownerName: true,
        phoneNumber: true,
        district: true,
        province: true,
        sector: true,
        cell: true,
        village: true,
        status: true,
        aiValuation: true,
        aiConfidence: true,
        createdAt: true,
        images: {
          where: { isFeatured: true },
          take: 1,
          select: {
            id: true,
            url: true
          }
        },
        fieldData: {
          select: {
            propertyType: true,
            landSize: true,
            buildingSize: true,
            bedrooms: true,
            bathrooms: true,
            condition: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.property.count({ where })
  ]);
  
  return {
    properties,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

export const getPublishedPropertyById = async (propertyId: string) => {
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      status: 'APPROVED'
    },
    select: {
      id: true,
      upiNumber: true,
      ownerName: true,
      phoneNumber: true,
      district: true,
      province: true,
      sector: true,
      cell: true,
      village: true,
      status: true,
      aiValuation: true,
      aiConfidence: true,
      createdAt: true,
      images: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          url: true,
          isFeatured: true,
          order: true
        }
      },
      fieldData: {
        select: {
          propertyType: true,
          landSize: true,
          buildingSize: true,
          bedrooms: true,
          bathrooms: true,
          condition: true,
          yearBuilt: true,
          parkingSpaces: true,
          hasGarden: true,
          gardenSize: true,
          gardenType: true,
          hasAnnex: true,
          annexType: true,
          annexSize: true,
          hasGate: true,
          gateType: true,
          hasFence: true,
          fenceType: true,
          fenceHeight: true,
          nearestSchoolKm: true,
          nearestHospitalKm: true,
          nearestTransportKm: true,
          nearestMarketKm: true,
          roadAccessType: true,
          valuationAmount: true,
          notes: true
        }
      }
    }
  });
  
  if (!property) {
    throw new Error('Property not found');
  }
  
  return property;
};