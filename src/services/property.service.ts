import prisma from '../config/prisma'
import { geocodeRwandaAddress, buildRwandaAddress } from '../services/geocoding.service';

export interface CreatePropertyInput {
  title: string;
  description?: string;
  price: number;
  
  province: string;
  district: string;
  sector?: string;
  cell?: string;
  village?: string;
  street?: string;
 
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  yearBuilt?: number;
  propertyType?: string;
  images?: any[];
}

export async function createProperty(userId: string, data: CreatePropertyInput) {
  
  const fullAddress = buildRwandaAddress({
    street: data.street,
    village: data.village,
    cell: data.cell,
    sector: data.sector,
    district: data.district,
    province: data.province
  });
  
  console.log('🏠 Creating property at:', fullAddress);
  
  const coordinates = await geocodeRwandaAddress({
    district: data.district,
    province: data.province

  });
  
  const propertyData: any = {
    title: data.title,
    description: data.description,
    price: data.price,
    province: data.province,
    district: data.district,
    sector: data.sector,      
    cell: data.cell,           
    village: data.village,     
    street: data.street,
    fullAddress: fullAddress,  
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    ownerId: userId,
    status: 'ACTIVE'
  };
  
  if (coordinates) {
    propertyData.latitude = coordinates.latitude;
    propertyData.longitude = coordinates.longitude;
  } else {

  }
  
  const property = await prisma.property.create({
    data: propertyData
  });
  
  if (data.images && data.images.length > 0) {
    await prisma.propertyImage.createMany({
      data: data.images.map((img, index) => ({
        propertyId: property.id,
        url: img.url,
        publicId: img.publicId,
        altText: img.altText || data.title,
        fileSize: img.fileSize || null,
      mimeType: img.mimeType || null,
        order: index,
        isFeatured: index === 0,
        uploadedBy: userId
      }))
    });
  }
  
  return property;
}

export async function postProperty(userId: string, data: CreatePropertyInput, ipAddress?: string) {
  
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  let upgraded = false;

  if (user.role !== 'OWNER') {
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'OWNER' }
    });
    upgraded = true;
    console.log(` User ${userId} upgraded from ${user.role} to OWNER`);
  }

  const property = await createProperty(userId, data);

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'PROPERTY_CREATED',
      entityType: 'Property',
      entityId: property.id,
      details: {
        title: property.title,
        price: property.price,
        province: property.province,
        district: property.district
      },
      ipAddress
    }
  });
  
  return {
    property,
    upgraded,
    message: upgraded 
      ? ' You are now a seller! Your property has been listed.'
      : ' Property listed successfully!'
  };
}

// Get properties by location (filter by province/district)
export async function getPropertiesByLocation(filters: {
  province?: string;
  district?: string;
  sector?: string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 10, ...whereFilters } = filters;
  const skip = (page - 1) * limit;
  
  const where: any = {};
  
  if (whereFilters.province) where.province = whereFilters.province;
  if (whereFilters.district) where.district = whereFilters.district;
  if (whereFilters.sector) where.sector = whereFilters.sector;
  if (whereFilters.minPrice) where.price = { gte: whereFilters.minPrice };
  if (whereFilters.maxPrice) where.price = { ...where.price, lte: whereFilters.maxPrice };
  
  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip,
      take: limit,
      include: {
        images: {
          where: { isFeatured: true },
          take: 1
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
      pages: Math.ceil(total / limit)
    }
  };
}

export async function getPropertyById(userId: String) {
   
}