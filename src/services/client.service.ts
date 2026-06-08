import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';

export const createProperty = async (
  userId: string,
  data: {
    upiNumber: string;
    ownerName: string;
    idOrTin: string;  
    phoneNumber: string;
    country?: string;
    province: string;
    district: string;
    sector?: string;
    cell?: string;
    village?: string;
  }
) => {

  const existingProperty = await prisma.property.findFirst({
    where: { upiNumber: data.upiNumber }
  });
  
  if (existingProperty) {
    throw new AppError('Property with this UPI number already exists', 400);
  }

  const property = await prisma.property.create({
    data: {
      upiNumber: data.upiNumber,
      ownerName: data.ownerName,
      idOrTin: data.idOrTin, 
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
    status: { not: 'ARCHIVED' } 
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

  const existingProperty = await prisma.property.findFirst({
    where: {
      id: propertyId,
      clientId: userId
    }
  });
  
  if (!existingProperty) {
    throw new AppError('Property not found', 404);
  }

  const nonEditableStatuses = ['IN_FIELDWORK', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'SOLD'];
  if (nonEditableStatuses.includes(existingProperty.status)) {
    throw new AppError(`Cannot edit property while status is ${existingProperty.status}`, 400);
  }

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

export const deleteProperty = async (userId: string, propertyId: string) => {
  const existingProperty = await prisma.property.findFirst({
    where: {
      id: propertyId,
      clientId: userId
    }
  });
  
  if (!existingProperty) {
    throw new AppError('Property not found', 404);
  }

  const protectedStatuses = ['IN_FIELDWORK', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'SOLD'];
  if (protectedStatuses.includes(existingProperty.status)) {
    throw new AppError(`Cannot delete property while status is ${existingProperty.status}`, 400);
  }
  
   const deletedProperty = await prisma.property.delete({
    where: { id: propertyId }
  });

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

// ===== ADD THESE NEW FUNCTIONS FOR ACCESS CONTROL =====

// Get client properties with access requests and institutions
export const getClientPropertiesWithAccess = async (clientId: string) => {
  const properties = await prisma.property.findMany({
    where: { clientId: clientId },
    include: {
      sharedWith: {
        include: {
          institution: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return properties.map(property => ({
    id: property.id,
    upiNumber: property.upiNumber,
    ownerName: property.ownerName,
    district: property.district,
    province: property.province,
    status: property.status,
    aiValuation: property.aiValuation,
    createdAt: property.createdAt,
    institutions: property.sharedWith
      .filter(access => access.clientConsent === true)
      .map(access => ({
        id: access.institution.id,
        name: access.institution.name,
        email: access.institution.email,
        accessType: access.accessType,
        grantedAt: access.grantedAt,
        isPending: false
      })),
    pendingRequests: property.sharedWith
      .filter(access => access.clientConsent === null && access.accessRequestedAt)
      .map(access => ({
        id: access.id,
        institutionId: access.institution.id,
        institution: {
          id: access.institution.id,
          name: access.institution.name,
          email: access.institution.email
        },
        accessType: access.accessType,
        accessRequestedAt: access.accessRequestedAt
      }))
  }));
};

// Approve access request from institution
export const approveAccessRequest = async (
  clientId: string,
  propertyId: string,
  institutionId: string,
  accessType: string = 'VIEW_ONLY'
) => {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, clientId }
  });

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  const access = await prisma.propertyAccess.findUnique({
    where: {
      propertyId_institutionId: {
        propertyId,
        institutionId
      }
    },
    include: {
      institution: true,
      property: true
    }
  });

  if (!access) {
    throw new AppError('Access request not found', 404);
  }

  if (access.clientConsent === true) {
    throw new AppError('Access already granted', 400);
  }

  const updatedAccess = await prisma.propertyAccess.update({
    where: {
      propertyId_institutionId: {
        propertyId,
        institutionId
      }
    },
    data: {
      clientConsent: true,
      accessApprovedAt: new Date(),
      accessType: accessType as any,
      grantedAt: new Date()
    },
    include: {
      institution: true,
      property: true
    }
  });

  return {
    success: true,
    message: 'Access granted successfully',
    access: updatedAccess
  };
};

// Revoke access from institution
export const revokeAccess = async (
  clientId: string,
  propertyId: string,
  institutionId: string
) => {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, clientId }
  });

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  const access = await prisma.propertyAccess.findUnique({
    where: {
      propertyId_institutionId: {
        propertyId,
        institutionId
      }
    }
  });

  if (!access) {
    throw new AppError('Access not found', 404);
  }

  await prisma.propertyAccess.delete({
    where: {
      propertyId_institutionId: {
        propertyId,
        institutionId
      }
    }
  });

  return {
    success: true,
    message: 'Access revoked successfully'
  };
};

// Add to client.service.ts

export const getAccessRequests = async (clientId: string) => {
  const accessRequests = await prisma.propertyAccess.findMany({
    where: {
      clientId: clientId,
      clientConsent: null,
      accessRequestedAt: { not: null }
    },
    include: {
      property: {
        select: {
          id: true,
          upiNumber: true,
          ownerName: true,
          district: true,
          province: true,
          status: true,
          aiValuation: true
        }
      },
      institution: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
      }
    },
    orderBy: { accessRequestedAt: 'desc' }
  });

  return accessRequests;
};

export const rejectAccessRequest = async (clientId: string, requestId: string) => {
  const accessRequest = await prisma.propertyAccess.findFirst({
    where: {
      id: requestId,
      clientId: clientId,
      clientConsent: null
    }
  });

  if (!accessRequest) {
    throw new AppError('Access request not found', 404);
  }

  const updated = await prisma.propertyAccess.update({
    where: { id: requestId },
    data: { clientConsent: false }
  });

  return {
    success: true,
    message: 'Access request rejected',
    access: updated
  };
};