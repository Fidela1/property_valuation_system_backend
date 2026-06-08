import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';

// Helper function to exclude synthetic properties
const excludeSynthetic = {
  upiNumber: {
    not: {
      startsWith: 'SYN-'
    }
  }
};

// Helper function to select all field data fields including premium features
const fieldDataSelect = {
  propertyType: true,
  landSize: true,
  buildingSize: true,
  bedrooms: true,
  bathrooms: true,
  condition: true,
  yearBuilt: true,
  valuationAmount: true,
  notes: true,
  parkingSpaces: true,
  gpsAccuracy: true,
  latitude: true,
  longitude: true,
  hasGarden: true,
  gardenSize: true,
  gardenType: true,
  hasAnnex: true,
  annexType: true,
  annexSize: true,
  annexBedrooms: true,
  annexBathrooms: true,
  hasGate: true,
  gateType: true,
  gateMaterial: true,
  hasFence: true,
  fenceType: true,
  fenceHeight: true,
  nearestSchoolKm: true,
  nearestHospitalKm: true,
  nearestTransportKm: true,
  nearestMarketKm: true,
  roadAccessType: true,
  hasElectricity: true,
  hasWaterSupply: true,
  hasWaterTank: true,
  // Premium features
  hasSwimmingPool: true,
  hasGym: true,
  hasSmartHome: true,
  hasSolarPanels: true,
  hasBackupGenerator: true,
  hasSecuritySystem: true,
  hasLandscapedGarden: true,
  hasModernKitchen: true,
  hasAirConditioning: true,
  hasFireplace: true,
  hasBalcony: true,
  hasGarage: true,
  hasStaffQuarters: true,
  hasStorageRoom: true,
  hasWaterHeater: true,
  hasIntercom: true,
  viewType: true
};

export const getPendingProperties = async (options: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const skip = (page - 1) * limit;
  
  const where: any = { 
    status: 'PENDING',
    ...excludeSynthetic
  };
  
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
  
  const where: any = { 
    status: 'UNDER_REVIEW',
    ...excludeSynthetic
  };
  
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
        fieldData: {
          select: fieldDataSelect
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

export const getInFieldworkProperties = async (options: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const skip = (page - 1) * limit;
  
  const where: any = { 
    status: 'IN_FIELDWORK',
    ...excludeSynthetic
  };
  
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
          select: fieldDataSelect
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
  
  const where: any = { ...excludeSynthetic };

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
          select: fieldDataSelect
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

export const getPropertyForReview = async (propertyId: string) => {
  const cleanId = String(propertyId).trim();

  const property = await prisma.property.findUnique({
    where: {
      id: cleanId,
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      assignment: {
        include: {
          collector: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          assignedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      fieldData: {
        select: fieldDataSelect
      },
      images: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  });

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  return property;
};

export const getSupervisorStats = async (supervisorId: string) => {
  const baseWhere = { ...excludeSynthetic };
  
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
    prisma.property.count({ where: baseWhere }),
    prisma.property.count({ where: { ...baseWhere, status: 'PENDING' } }),
    prisma.property.count({ where: { ...baseWhere, status: 'UNDER_REVIEW' } }),
    prisma.property.count({ where: { ...baseWhere, status: 'APPROVED' } }),
    prisma.property.count({ where: { ...baseWhere, status: 'PUBLISHED' } }),
    prisma.property.count({ where: { ...baseWhere, status: 'NEEDS_REVISION' } }),
    prisma.property.count({ where: { ...baseWhere, status: 'IN_FIELDWORK' } }),
    prisma.property.count({ where: { ...baseWhere, status: 'ASSIGNED' } })
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
    where: baseWhere,
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

export const getPropertiesForReportDropdown = async () => {
  const properties = await prisma.property.findMany({
    where: {
      status: {
        in: ['APPROVED', 'PUBLISHED']
      },
      ...excludeSynthetic
    },
    select: {
      id: true,
      upiNumber: true,
      ownerName: true,
      district: true,
      province: true,
      aiValuation: true,
      status: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  return properties;
};

export const getAvailableDataCollectors = async () => {
  const collectors = await prisma.user.findMany({
    where: {
      role: 'DATA_COLLECTOR',
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      isActive: true,
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
    isActive: collector.isActive,
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
  const property = await prisma.property.findUnique({
    where: { id: propertyId }
  });
  
  if (!property) {
    throw new AppError('Property not found', 404);
  }
  
  if (property.status !== 'PENDING') {
    throw new AppError(`Cannot assign: Property status is ${property.status}`, 400);
  }
  
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
      collectorId: collector.id,
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