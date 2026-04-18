import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';

// ============================================
// GET PENDING PROPERTIES (Unassigned)
// ============================================

export const getPendingProperties = async (options: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const skip = (page - 1) * limit;
  
  const where: any = { status: 'PENDING' };
  
  if (options?.search) {
    where.OR = [
      { upiNumber: { contains: options.search, mode: 'insensitive' } },
      { ownerName: { contains: options.search, mode: 'insensitive' } },
      { phoneNumber: { contains: options.search, mode: 'insensitive' } }
    ];
  }
  
  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip,
      take: limit,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
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

// ============================================
// GET PROPERTIES UNDER REVIEW
// ============================================

export const getUnderReviewProperties = async (options: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const skip = (page - 1) * limit;
  
  const where: any = { status: 'UNDER_REVIEW' };
  
  if (options?.search) {
    where.OR = [
      { upiNumber: { contains: options.search, mode: 'insensitive' } },
      { ownerName: { contains: options.search, mode: 'insensitive' } }
    ];
  }
  
  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip,
      take: limit,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        fieldData: true,
        assignment: {
          include: {
            collector: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        images: {
          where: { isFeatured: true },
          take: 1,
          select: { url: true }
        }
      },
      orderBy: { updatedAt: 'asc' }
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

// ============================================
// GET ALL AVAILABLE DATA COLLECTORS
// ============================================

export const getAvailableDataCollectors = async () => {
  const collectors = await prisma.user.findMany({
    where: {
      role: 'DATA_COLLECTOR',
      isActive: true
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      assignments: {
        where: {
          property: {
            status: {
              in: ['ASSIGNED', 'IN_FIELDWORK']
            }
          }
        }
      }
    }
  });
  
  return collectors.map(collector => ({
    ...collector,
    activeWorkload: collector.assignments.length,
    isAvailable: collector.assignments.length < 5  // Max 5 active assignments
  }));
};

// ============================================
// ASSIGN DATA COLLECTOR TO PROPERTY
// ============================================

export const assignDataCollector = async (
  propertyId: string,
  collectorId: string,
  supervisorId: string,
  notes?: string
) => {
  // Check if property exists and is PENDING
  const property = await prisma.property.findUnique({
    where: { id: propertyId }
  });
  
  if (!property) {
    throw new AppError('Property not found', 404);
  }
  
  if (property.status !== 'PENDING') {
    throw new AppError(`Cannot assign: Property status is ${property.status}`, 400);
  }
  
  // Check if collector exists and has correct role
  const collector = await prisma.user.findUnique({
    where: { id: collectorId }
  });
  
  if (!collector || collector.role !== 'DATA_COLLECTOR') {
    throw new AppError('Invalid data collector', 400);
  }
  
  if (!collector.isActive) {
    throw new AppError('Data collector is inactive', 400);
  }
  
  // Create assignment
  const assignment = await prisma.assignment.create({
    data: {
      propertyId,
      collectorId,
      assignedById: supervisorId,
      notes,
      assignedAt: new Date()
    }
  });
  
  // Update property status
  const updatedProperty = await prisma.property.update({
    where: { id: propertyId },
    data: { status: 'ASSIGNED' }
  });
  
  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: supervisorId,
      action: 'DATA_COLLECTOR_ASSIGNED',
      entityType: 'Property',
      entityId: propertyId,
      details: {
        collectorId,
        collectorName: collector.name,
        notes
      }
    }
  });
  
  return {
    assignment,
    property: updatedProperty
  };
};

// ============================================
// GET PROPERTY DETAILS FOR REVIEW
// ============================================

export const getPropertyForReview = async (propertyId: string) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
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
      images: {
        orderBy: { order: 'asc' }
      }
    }
  });
  
  if (!property) {
    throw new AppError('Property not found', 404);
  }
  
  return property;
};

// ============================================
// APPROVE PROPERTY
// ============================================

export const approveProperty = async (
  propertyId: string,
  supervisorId: string,
  comment: string
) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { fieldData: true }
  });
  
  if (!property) {
    throw new AppError('Property not found', 404);
  }
  
  if (property.status !== 'UNDER_REVIEW') {
    throw new AppError(`Cannot approve: Property status is ${property.status}`, 400);
  }
  
  // Create review record
  const review = await prisma.review.create({
    data: {
      propertyId,
      supervisorId,
      comment,
      decision: 'APPROVED'
    }
  });
  
  // Update property status
  const updatedProperty = await prisma.property.update({
    where: { id: propertyId },
    data: { 
      status: 'APPROVED',
      aiValuation: property.fieldData?.valuationAmount,
      aiConfidence: 85  // Default confidence for now
    }
  });
  
  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: supervisorId,
      action: 'PROPERTY_APPROVED',
      entityType: 'Property',
      entityId: propertyId,
      details: { comment }
    }
  });
  
  return {
    review,
    property: updatedProperty
  };
};

// ============================================
// REJECT PROPERTY (NEEDS REVISION)
// ============================================

export const rejectProperty = async (
  propertyId: string,
  supervisorId: string,
  comment: string
) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId }
  });
  
  if (!property) {
    throw new AppError('Property not found', 404);
  }
  
  if (property.status !== 'UNDER_REVIEW') {
    throw new AppError(`Cannot reject: Property status is ${property.status}`, 400);
  }
  
  // Create review record
  const review = await prisma.review.create({
    data: {
      propertyId,
      supervisorId,
      comment,
      decision: 'NEEDS_REVISION'
    }
  });
  
  // Update property status
  const updatedProperty = await prisma.property.update({
    where: { id: propertyId },
    data: { status: 'NEEDS_REVISION' }
  });
  
  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: supervisorId,
      action: 'PROPERTY_REJECTED',
      entityType: 'Property',
      entityId: propertyId,
      details: { comment }
    }
  });
  
  return {
    review,
    property: updatedProperty
  };
};

// ============================================
// PUBLISH APPROVED PROPERTY
// ============================================

export const publishProperty = async (propertyId: string, supervisorId: string) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId }
  });
  
  if (!property) {
    throw new AppError('Property not found', 404);
  }
  
  if (property.status !== 'APPROVED') {
    throw new AppError(`Cannot publish: Property status is ${property.status}`, 400);
  }
  
  const updatedProperty = await prisma.property.update({
    where: { id: propertyId },
    data: { 
      status: 'PUBLISHED',
      publishedAt: new Date()
    }
  });
  
  await prisma.auditLog.create({
    data: {
      userId: supervisorId,
      action: 'PROPERTY_PUBLISHED',
      entityType: 'Property',
      entityId: propertyId,
      details: { publishedAt: new Date() }
    }
  });
  
  return updatedProperty;
};

// ============================================
// GET SUPERVISOR STATISTICS
// ============================================

export const getSupervisorStats = async (supervisorId: string) => {
  const [
    pendingCount,
    underReviewCount,
    approvedCount,
    publishedCount,
    rejectedCount
  ] = await Promise.all([
    prisma.property.count({ where: { status: 'PENDING' } }),
    prisma.property.count({ where: { status: 'UNDER_REVIEW' } }),
    prisma.property.count({ where: { status: 'APPROVED' } }),
    prisma.property.count({ where: { status: 'PUBLISHED' } }),
    prisma.property.count({ where: { status: 'NEEDS_REVISION' } })
  ]);
  
  // Get recent activity
  const recentReviews = await prisma.review.findMany({
    where: { supervisorId },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      property: {
        select: {
          id: true,
          upiNumber: true,
          ownerName: true
        }
      }
    }
  });
  
  return {
    counts: {
      pending: pendingCount,
      underReview: underReviewCount,
      approved: approvedCount,
      published: publishedCount,
      rejected: rejectedCount
    },
    recentReviews
  };
};