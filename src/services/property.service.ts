// import prisma from '../config/prisma'
// import { geocodeRwandaAddress, buildRwandaAddress } from '../services/geocoding.service';

// export interface CreatePropertyInput {
//   title: string;
//   description?: string;
//   price: number;
  
//   province: string;
//   district: string;
//   sector?: string;
//   cell?: string;
//   village?: string;
//   street?: string;
 
//   bedrooms?: number;
//   bathrooms?: number;
//   squareFeet?: number;
//   yearBuilt?: number;
//   propertyType?: string;
//   images?: any[];
// }

// export async function createPropertyService(userId: string, data: CreatePropertyInput) {
  
//   const fullAddress = buildRwandaAddress({
//     street: data.street,
//     village: data.village,
//     cell: data.cell,
//     sector: data.sector,
//     district: data.district,
//     province: data.province
//   });
  
//   console.log('Creating property at:', fullAddress);
  
//   const coordinates = await geocodeRwandaAddress({
//     district: data.district,
//     province: data.province

//   });
  
//   const propertyData: any = {
//     title: data.title,
//     description: data.description,
//     price: data.price,
//     province: data.province,
//     district: data.district,
//     sector: data.sector,      
//     cell: data.cell,           
//     village: data.village,     
//     street: data.street,
//     fullAddress: fullAddress,  
//     bedrooms: data.bedrooms,
//     bathrooms: data.bathrooms,
//     ownerId: userId,
//     status: 'ACTIVE'
//   };
  
//   if (coordinates) {
//     propertyData.latitude = coordinates.latitude;
//     propertyData.longitude = coordinates.longitude;
//   } else {

//   }
  
//   const property = await prisma.property.create({
//     data: propertyData
//   });
  
//   if (data.images && data.images.length > 0) {
//     await prisma.propertyImage.createMany({
//       data: data.images.map((img, index) => ({
//         propertyId: property.id,
//         url: img.url,
//         publicId: img.publicId,
//         altText: img.altText || data.title,
//         fileSize: img.fileSize || null,
//       mimeType: img.mimeType || null,
//         order: index,
//         isFeatured: index === 0,
//         uploadedBy: userId
//       }))
//     });
//   }
  
//   return property;
// }

// export async function postPropertyService(userId: string, data: CreatePropertyInput, ipAddress?: string) {
  
//   const user = await prisma.user.findUnique({
//     where: { id: userId }
//   });
  
//   if (!user) {
//     throw new Error('User not found');
//   }
  
//   let upgraded = false;

//   if (user.role !== 'OWNER') {
//     await prisma.user.update({
//       where: { id: userId },
//       data: { role: 'OWNER' }
//     });
//     upgraded = true;
//     console.log(` User ${userId} upgraded from ${user.role} to OWNER`);
//   }

//   const property = await createPropertyService(userId, data);

//   await prisma.auditLog.create({
//     data: {
//       userId,
//       action: 'PROPERTY_CREATED',
//       entityType: 'Property',
//       entityId: property.id,
//       details: {
//         title: property.title,
//         price: property.price,
//         province: property.province,
//         district: property.district
//       },
//       ipAddress
//     }
//   });
  
//   return {
//     property,
//     upgraded,
//     message: upgraded 
//       ? ' You are now a seller! Your property has been listed.'
//       : ' Property listed successfully!'
//   };
// }

// // src/services/property.service.ts

// // ✅ ONE function that does everything
// export async function getAllPropertiesService(filters?: {
//   page?: number;
//   limit?: number;
//   province?: string;
//   district?: string;
//   sector?: string;
//   minPrice?: number;
//   maxPrice?: number;
//   bedrooms?: number;
//   propertyType?: string;
// }) {
//   const page = filters?.page || 1;
//   const limit = filters?.limit || 10;
//   const skip = (page - 1) * limit;
  
//   // Build where clause dynamically
//   const where: any = { status: 'ACTIVE' };
  
//   // Add filters ONLY if they are provided
//   if (filters?.province) where.province = filters.province;
//   if (filters?.district) where.district = filters.district;
//   if (filters?.sector) where.sector = filters.sector;
//   if (filters?.minPrice) where.price = { gte: filters.minPrice };
//   if (filters?.maxPrice) where.price = { ...where.price, lte: filters.maxPrice };
//   if (filters?.bedrooms) where.bedrooms = filters.bedrooms;
//   if (filters?.propertyType) where.propertyType = filters.propertyType;
  
//   const [properties, total] = await Promise.all([
//     prisma.property.findMany({
//       where,
//       skip,
//       take: limit,
//       include: {
//         images: {
//           where: { isFeatured: true },
//           take: 1
//         }
//       },
//       orderBy: { createdAt: 'desc' }
//     }),
//     prisma.property.count({ where })
//   ]);
  
//   return {
//     properties,
//     pagination: {
//       page,
//       limit,
//       total,
//       totalPages: Math.ceil(total / limit)
//     }
//   };
// }

// export async function getPropertiesByUserIdService(userId: string, status?: string) {
//   const where: any = {
//     ownerId: userId
//   };

//   if (status) {
//     where.status = status;
//   }
  
//   const properties = await prisma.property.findMany({
//     where,
//     include: {
//       images: {
//         where: { isFeatured: true },
//         take: 1,
//         select: {
//           id: true,
//           url: true,
//           altText: true
//         }
//       }
//     },
//     orderBy: { createdAt: 'desc' }
//   });
  
//   return {
//     properties,
//     total: properties.length
//   };
// }

// export async function deletePropertyByIdService(propertyId: string, userId: string){
//   const properties = await prisma.property.delete({
//     where: {
//       id: propertyId,
//       ownerId: userId
//     }
//   })
//   return properties;aa
// }