import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';

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

// In your backend collector.service.ts
export const getAvailableDataCollectors = async () => {
  const collectors = await prisma.user.findMany({
    where: {
      role: 'DATA_COLLECTOR',
      // Don't filter by isActive here if you want to see inactive ones too
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,  // ✅ Make sure this is selected
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
    id: collector.id,
    name: collector.name,
    email: collector.email,
    phone: collector.phone,
    isActive: collector.isActive,  // ✅ Return the actual value
    currentAssignments: collector.assignments.length,
    isAvailable: collector.isActive && collector.assignments.length < 5
  }));
};

export const assignDataCollector = async (
  propertyId: string,
  collectorEmail: string,
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
  
  // Find collector by email instead of ID
  const collector = await prisma.user.findUnique({
    where: { email: collectorEmail.toLowerCase().trim() }
  });
  
  if (!collector) {
    throw new AppError('Data collector not found with this email', 404);
  }
  
  if (collector.role !== 'DATA_COLLECTOR') {
    throw new AppError(`User with email ${collectorEmail} is not a data collector`, 400);
  }
  
  if (!collector.isActive) {
    throw new AppError('Data collector is inactive', 400);
  }

  const assignment = await prisma.assignment.create({
    data: {
      propertyId,
      collectorId: collector.id,  // Use the found collector's ID
      assignedById: supervisorId,
      notes,
      assignedAt: new Date()
    }
  });

  const updatedProperty = await prisma.property.update({
    where: { id: propertyId },
    data: { status: 'ASSIGNED' }
  });

  await prisma.auditLog.create({
    data: {
      userId: supervisorId,
      action: 'DATA_COLLECTOR_ASSIGNED',
      entityType: 'Property',
      entityId: propertyId,
      details: {
        collectorEmail: collector.email,
        collectorName: collector.name,
        collectorId: collector.id,
        notes
      }
    }
  });
  
  return {
    assignment,
    property: updatedProperty
  };
};

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

  const review = await prisma.review.create({
    data: {
      propertyId,
      supervisorId,
      comment,
      decision: 'APPROVED'
    }
  });
  
  const updatedProperty = await prisma.property.update({
    where: { id: propertyId },
    data: { 
      status: 'APPROVED',
      aiValuation: property.fieldData?.valuationAmount,
      aiConfidence: 85 
    }
  });
  
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
 
  const review = await prisma.review.create({
    data: {
      propertyId,
      supervisorId,
      comment,
      decision: 'NEEDS_REVISION'
    }
  });

  const updatedProperty = await prisma.property.update({
    where: { id: propertyId },
    data: { status: 'NEEDS_REVISION' }
  });

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

export const getSupervisorStats = async (supervisorId: string) => {
  const [
    totalProperties,
    pendingCount,
    underReviewCount,
    approvedCount,
    publishedCount,
    rejectedCount,
    inFieldworkCount,
    assignedCount
  ] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { status: 'PENDING' } }),
    prisma.property.count({ where: { status: 'UNDER_REVIEW' } }),
    prisma.property.count({ where: { status: 'APPROVED' } }),
    prisma.property.count({ where: { status: 'PUBLISHED' } }),
    prisma.property.count({ where: { status: 'NEEDS_REVISION' } }),
    prisma.property.count({ where: { status: 'IN_FIELDWORK' } }),
    prisma.property.count({ where: { status: 'ASSIGNED' } })
  ]);

  const inProgress = pendingCount + assignedCount + inFieldworkCount;
  const completed = approvedCount + publishedCount;

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

  const recentProperties = await prisma.property.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      upiNumber: true,
      ownerName: true,
      status: true,
      district: true,
      createdAt: true
    }
  });
  
  return {
    counts: {
      total: totalProperties,
      pending: pendingCount,
      underReview: underReviewCount,
      approved: approvedCount,
      published: publishedCount,
      rejected: rejectedCount,
      inFieldwork: inFieldworkCount,
      assigned: assignedCount,
      inProgress: inProgress,
      completed: completed
    },
    recentReviews,
    recentProperties
  };
};

export const getInFieldworkProperties = async (options: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const skip = (page - 1) * limit;
  
  const where: any = { status: 'IN_FIELDWORK' };
  
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
        fieldData: {
          select: {
            propertyType: true,
            landSize: true,
            buildingSize: true,
            bedrooms: true,
            bathrooms: true,
            condition: true,
            yearBuilt: true,
            valuationAmount: true,
            notes: true
          }
        },
        images: {
          orderBy: { order: 'asc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
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

export const getAllProperties = async (options: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) => {
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const skip = (page - 1) * limit;
  
  const where: any = {};

  if (options?.status && options.status !== 'ALL') {
    where.status = options.status;
  }

  if (options?.search) {
    where.OR = [
      { upiNumber: { contains: options.search, mode: 'insensitive' } },
      { ownerName: { contains: options.search, mode: 'insensitive' } },
      { phoneNumber: { contains: options.search, mode: 'insensitive' } },
      { district: { contains: options.search, mode: 'insensitive' } }
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
        fieldData: {
          select: {
            propertyType: true,
            landSize: true,
            buildingSize: true,
            bedrooms: true,
            bathrooms: true,
            condition: true,
            yearBuilt: true,
            valuationAmount: true,
            notes: true
          }
        },
        images: {
          orderBy: { order: 'asc' },
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
      totalPages: Math.ceil(total / limit)
    }
  };
};