import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';

// ============================================
// CREATE PROPERTY
// ============================================

export const createProperty = async (
  userId: string,
  data: {
    upiNumber: string;
    ownerName: string;
    tinNumber: string;
    phoneNumber: string;
    country?: string;
    province: string;
    district: string;
    sector?: string;
    cell?: string;
    village?: string;
   
  }
) => {
  // Check if UPI already exists
  const existingProperty = await prisma.property.findFirst({
    where: { upiNumber: data.upiNumber }
  });
  
  if (existingProperty) {
    throw new AppError('Property with this UPI number already exists', 400);
  }
  
  // Create property
  const property = await prisma.property.create({
    data: {
      upiNumber: data.upiNumber,
      ownerName: data.ownerName,
      idOrTin: data.tinNumber,
      phoneNumber: data.phoneNumber,
      country: data.country || 'Rwanda',
      province: data.province,
      district: data.district,
      sector: data.sector!,
      cell: data.cell!,
      village: data.village!,
      status: 'PENDING',
      clientId: userId
    }
  });
  
  // Log audit
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'PROPERTY_CREATED',
      entityType: 'Property',
      entityId: property.id,
      details: {
        upiNumber: data.upiNumber,
        province: data.province,
        district: data.district
      }
    }
  });
  
  return property;
};

// ============================================
// GET ALL CLIENT PROPERTIES
// ============================================

export const getClientProperties = async (
  userId: string,
  options?: {
    status?: string;
    page?: number;
    limit?: number;
  }
) => {
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const skip = (page - 1) * limit;
  
  const where: any = { 
    clientId: userId,
    status: { not: 'ARCHIVED' }  // ✅ Exclude archived properties
  };

  if (options?.status && options.status !== 'ALL') {
    where.status = options.status;
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
        province: true,
        district: true,
        sector: true,
        status: true,
        aiValuation: true,
        createdAt: true,
        updatedAt: true,
        images: {
          where: { isFeatured: true },
          take: 1,
          select: { url: true }
        },
        _count: {
          select: { inquiries: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.property.count({ where })
  ]);
  
  // Status counts for dashboard
  const statusCounts = await prisma.property.groupBy({
    by: ['status'],
    where: { clientId: userId,
      status: { not: 'ARCHIVED' }

     },
    _count: { status: true }
  });
  
  const counts = {
    total,
    pending: statusCounts.find(s => s.status === 'PENDING')?._count.status || 0,
    assigned: statusCounts.find(s => s.status === 'ASSIGNED')?._count.status || 0,
    inFieldwork: statusCounts.find(s => s.status === 'IN_FIELDWORK')?._count.status || 0,
    underReview: statusCounts.find(s => s.status === 'UNDER_REVIEW')?._count.status || 0,
    needsRevision: statusCounts.find(s => s.status === 'NEEDS_REVISION')?._count.status || 0,
    approved: statusCounts.find(s => s.status === 'APPROVED')?._count.status || 0,
    published: statusCounts.find(s => s.status === 'PUBLISHED')?._count.status || 0,
    sold: statusCounts.find(s => s.status === 'SOLD')?._count.status || 0,
    archived: statusCounts.find(s => s.status === 'ARCHIVED')?._count.status || 0
  };
  
  return {
    properties,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    counts
  };
};

// ============================================
// GET SINGLE PROPERTY (with ownership check)
// ============================================

export const getClientPropertyById = async (userId: string, propertyId: string) => {
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      clientId: userId
    },
    include: {
      images: {
        orderBy: { order: 'asc' }
      },
      assignment: {
        include: {
          collector: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          assignedBy: {
            select: {
              name: true,
              email: true
            }
          }
        }
      },
      fieldData: true,
      reviews: {
        orderBy: { createdAt: 'desc' },
        include: {
          supervisor: {
            select: {
              name: true,
              email: true
            }
          }
        }
      },
      inquiries: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });
  
  if (!property) {
    throw new AppError('Property not found', 404);
  }
  
  // Get view count
  const viewCount = await prisma.auditLog.count({
    where: {
      entityType: 'Property',
      entityId: propertyId,
      action: 'PROPERTY_VIEWED'
    }
  });
  
  return {
    ...property,
    stats: {
      viewCount,
      inquiryCount: property.inquiries.length
    }
  };
};

// ============================================
// UPDATE PROPERTY
// ============================================

export const updateProperty = async (
  userId: string,
  propertyId: string,
  data: {
    ownerName?: string;
    phoneNumber?: string;
    province?: string;
    district?: string;
    sector?: string;
    cell?: string;
    village?: string;
  }
) => {
  // Check if property exists and belongs to user
  const existingProperty = await prisma.property.findFirst({
    where: {
      id: propertyId,
      clientId: userId
    }
  });
  
  if (!existingProperty) {
    throw new AppError('Property not found', 404);
  }
  
  // Cannot edit if status is beyond certain point
  const nonEditableStatuses = ['IN_FIELDWORK', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'SOLD'];
  if (nonEditableStatuses.includes(existingProperty.status)) {
    throw new AppError(`Cannot edit property while status is ${existingProperty.status}`, 400);
  }
  
  // Update property
  const updatedProperty = await prisma.property.update({
    where: { id: propertyId },
    data: {
      ownerName: data.ownerName,
      phoneNumber: data.phoneNumber,
      province: data.province,
      district: data.district,
      sector: data.sector,
      cell: data.cell,
      village: data.village,
    
    }
  });
  
  // Log audit
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'PROPERTY_UPDATED',
      entityType: 'Property',
      entityId: propertyId,
      details: { updatedFields: Object.keys(data) }
    }
  });
  
  return updatedProperty;
};

// ============================================
// DELETE PROPERTY (Soft Delete)
// ============================================

export const deleteProperty = async (userId: string, propertyId: string) => {
  // Check if property exists and belongs to user
  const existingProperty = await prisma.property.findFirst({
    where: {
      id: propertyId,
      clientId: userId
    }
  });
  
  if (!existingProperty) {
    throw new AppError('Property not found', 404);
  }
  
  // Cannot delete if status is beyond certain point
  const protectedStatuses = ['IN_FIELDWORK', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'SOLD'];
  if (protectedStatuses.includes(existingProperty.status)) {
    throw new AppError(`Cannot delete property while status is ${existingProperty.status}`, 400);
  }
  
   const deletedProperty = await prisma.property.delete({
    where: { id: propertyId }
  });
  
  // Log audit
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'PROPERTY_DELETED',
      entityType: 'Property',
      entityId: propertyId,
      details: { upiNumber: existingProperty.upiNumber }
    }
  });
  
  return deletedProperty;
};

// ============================================
// GET PROPERTY STATUS WITH TIMELINE
// ============================================

export const getPropertyTimeline = async (userId: string, propertyId: string) => {
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      clientId: userId
    },
    select: {
      id: true,
      upiNumber: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      soldAt: true,
      assignment: {
        select: {
          assignedAt: true,
          verifiedAt: true
        }
      },
      fieldData: {
        select: {
          submittedAt: true
        }
      },
      reviews: {
        select: {
          createdAt: true,
          decision: true,
          comment: true
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });
  
  if (!property) {
    throw new AppError('Property not found', 404);
  }
  
  // Build timeline
  const timeline = [];
  
  timeline.push({
    date: property.createdAt,
    status: 'SUBMITTED',
    title: 'Application Submitted',
    description: 'Your property application has been submitted successfully.'
  });
  
  if (property.assignment?.assignedAt) {
    timeline.push({
      date: property.assignment.assignedAt,
      status: 'ASSIGNED',
      title: 'Data Collector Assigned',
      description: 'A data collector has been assigned to your property.'
    });
  }
  
  if (property.assignment?.verifiedAt) {
    timeline.push({
      date: property.assignment.verifiedAt,
      status: 'VERIFIED',
      title: 'Data Collector Accepted',
      description: 'The data collector has accepted the assignment.'
    });
  }
  
  if (property.fieldData?.submittedAt) {
    timeline.push({
      date: property.fieldData.submittedAt,
      status: 'FIELD_DATA_SUBMITTED',
      title: 'Field Data Submitted',
      description: 'The data collector has submitted the property assessment.'
    });
  }
  
  for (const review of property.reviews) {
    timeline.push({
      date: review.createdAt,
      status: review.decision === 'APPROVED' ? 'APPROVED' : 'NEEDS_REVISION',
      title: review.decision === 'APPROVED' ? 'Application Approved' : 'Revision Requested',
      description: review.comment
    });
  }
  
  if (property.publishedAt) {
    timeline.push({
      date: property.publishedAt,
      status: 'PUBLISHED',
      title: 'Property Published',
      description: 'Your property is now live on the platform.'
    });
  }
  
  if (property.soldAt) {
    timeline.push({
      date: property.soldAt,
      status: 'SOLD',
      title: 'Property Sold',
      description: 'Your property has been marked as sold.'
    });
  }
  
  return {
    currentStatus: property.status,
    timeline: timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  };
};
