import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';

// ============================================
// GET COLLECTOR STATISTICS (Dashboard)
// ============================================

export const getCollectorStats = async (collectorId: string) => {
  const [
    assignedCount,
    inFieldworkCount,
    underReviewCount,
    needsRevisionCount,
    completedCount
  ] = await Promise.all([
    prisma.property.count({
      where: {
        assignment: { collectorId },
        status: 'ASSIGNED'
      }
    }),
    prisma.property.count({
      where: {
        assignment: { collectorId },
        status: 'IN_FIELDWORK'
      }
    }),
    prisma.property.count({
      where: {
        assignment: { collectorId },
        status: 'UNDER_REVIEW'
      }
    }),
    prisma.property.count({
      where: {
        assignment: { collectorId },
        status: 'NEEDS_REVISION'
      }
    }),
    prisma.property.count({
      where: {
        assignment: { collectorId },
        status: { in: ['APPROVED', 'PUBLISHED'] }
      }
    })
  ]);

  const total = assignedCount + inFieldworkCount + underReviewCount + needsRevisionCount + completedCount;

  // Get recent submissions
  const recentSubmissions = await prisma.fieldData.findMany({
    where: {
      property: {
        assignment: { collectorId }
      }
    },
    take: 5,
    orderBy: { submittedAt: 'desc' },
    include: {
      property: {
        select: {
          id: true,
          upiNumber: true,
          ownerName: true,
          status: true
        }
      }
    }
  });

  return {
    counts: {
      assigned: assignedCount,
      inFieldwork: inFieldworkCount,
      underReview: underReviewCount,
      needsRevision: needsRevisionCount,
      completed: completedCount,
      total
    },
    recentSubmissions
  };
};

// ============================================
// GET ASSIGNED PROPERTIES
// ============================================

export const getAssignedProperties = async (
  collectorId: string,
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
    assignment: {
      collectorId
    }
  };

  if (options?.status && options.status !== 'ALL') {
    where.status = options.status;
  } else {
    where.status = { in: ['ASSIGNED', 'IN_FIELDWORK', 'NEEDS_REVISION'] };
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
          select: {
            id: true,
            assignedAt: true,
            verifiedAt: true,
            notes: true
          }
        },
        fieldData: true,
        reviews: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            comment: true,
            decision: true
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
// GET ASSIGNMENT BY ID
// ============================================

export const getAssignmentById = async (collectorId: string, assignmentId: string) => {
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      collectorId
    },
    include: {
      property: {
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
          reviews: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      },
      assignedBy: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  if (!assignment) {
    throw new AppError('Assignment not found', 404);
  }

  return assignment;
};

// ============================================
// ACCEPT ASSIGNMENT
// ============================================

export const acceptAssignment = async (collectorId: string, propertyId: string) => {
  // Check if property exists and is ASSIGNED
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      assignment: {
        collectorId
      },
      status: 'ASSIGNED'
    }
  });

  if (!property) {
    throw new AppError('Assignment not found or already accepted', 404);
  }

  // Update assignment with verification
  await prisma.assignment.update({
    where: { propertyId },
    data: { verifiedAt: new Date() }
  });

  // Update property status
  const updatedProperty = await prisma.property.update({
    where: { id: propertyId },
    data: { status: 'IN_FIELDWORK' }
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: collectorId,
      action: 'ASSIGNMENT_ACCEPTED',
      entityType: 'Property',
      entityId: propertyId,
      details: { acceptedAt: new Date() }
    }
  });

  return updatedProperty;
};

// ============================================
// SUBMIT FIELD DATA
// ============================================

export const submitFieldData = async (
  collectorId: string,
  data: {
    propertyId: string;
    latitude: number;
    longitude: number;
    gpsAccuracy?: number;
    // Property features
    propertyType?: string;
    condition?: string;
    bedrooms?: number;
    bathrooms?: number;
    landSize?: number;
    buildingSize?: number;
    yearBuilt?: number;
    parkingSpaces?: number;
    // Garden
    hasGarden?: boolean;
    gardenSize?: number;
    gardenType?: string;
    // Annex
    hasAnnex?: boolean;
    annexType?: string;
    annexSize?: number;
    annexBedrooms?: number;
    annexBathrooms?: number;
    // Gate
    hasGate?: boolean;
    gateType?: string;
    gateMaterial?: string;
    // Fence
    hasFence?: boolean;
    fenceType?: string;
    fenceHeight?: number;
    // Neighborhood
    nearestSchoolKm?: number;
    nearestHospitalKm?: number;
    nearestTransportKm?: number;
    nearestMarketKm?: number;
    roadAccessType?: string;
    // Valuation
    valuationAmount?: number;
    notes?: string;
    images?: { url: string; publicId?: string }[];
  }
) => {
  // Check if property exists and is IN_FIELDWORK
  const property = await prisma.property.findFirst({
    where: {
      id: data.propertyId,
      assignment: {
        collectorId
      },
      status: 'IN_FIELDWORK'
    }
  });

  if (!property) {
    throw new AppError('Property not found or not in fieldwork status', 404);
  }

  // Helper function to validate enum values
  const validPropertyTypes = ['HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL'];
  const validConditions = ['EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_RENOVATION'];
  const validRoadAccessTypes = ['PAVED', 'UNPAVED', 'DIRT', 'UNDER_CONSTRUCTION'];

  // Create field data with proper enum casting
  const fieldData = await prisma.fieldData.create({
    data: {
      propertyId: data.propertyId,
      // GPS
      latitude: data.latitude,
      longitude: data.longitude,
      gpsAccuracy: data.gpsAccuracy,
      // Property features - cast to enum or null
      propertyType: data.propertyType && validPropertyTypes.includes(data.propertyType.toUpperCase()) 
        ? data.propertyType.toUpperCase() as any 
        : null,
      condition: data.condition && validConditions.includes(data.condition.toUpperCase())
        ? data.condition.toUpperCase() as any
        : null,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      landSize: data.landSize,
      buildingSize: data.buildingSize,
      yearBuilt: data.yearBuilt,
      parkingSpaces: data.parkingSpaces || 0,
      // Garden
      hasGarden: data.hasGarden || false,
      gardenSize: data.gardenSize,
      gardenType: data.gardenType,
      // Annex
      hasAnnex: data.hasAnnex || false,
      annexType: data.annexType,
      annexSize: data.annexSize,
      annexBedrooms: data.annexBedrooms,
      annexBathrooms: data.annexBathrooms,
      // Gate
      hasGate: data.hasGate || false,
      gateType: data.gateType,
      gateMaterial: data.gateMaterial,
      // Fence
      hasFence: data.hasFence || false,
      fenceType: data.fenceType,
      fenceHeight: data.fenceHeight,
      // Neighborhood - cast to enum or null
      roadAccessType: data.roadAccessType && validRoadAccessTypes.includes(data.roadAccessType.toUpperCase())
        ? data.roadAccessType.toUpperCase() as any
        : null,
      nearestSchoolKm: data.nearestSchoolKm,
      nearestHospitalKm: data.nearestHospitalKm,
      nearestTransportKm: data.nearestTransportKm,
      nearestMarketKm: data.nearestMarketKm,
      // Valuation
      valuationAmount: data.valuationAmount,
      notes: data.notes,
      submittedAt: new Date()
    }
  });

  // Add images if provided
  if (data.images && data.images.length > 0) {
    await prisma.image.createMany({
      data: data.images.map((img, index) => ({
        propertyId: data.propertyId,
        url: img.url,
        publicId: img.publicId,
        order: index,
        isFeatured: index === 0,
        uploadedBy: collectorId
      }))
    });
  }

  // Update property status to UNDER_REVIEW
  const updatedProperty = await prisma.property.update({
    where: { id: data.propertyId },
    data: { status: 'UNDER_REVIEW' }
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: collectorId,
      action: 'FIELD_DATA_SUBMITTED',
      entityType: 'Property',
      entityId: data.propertyId,
      details: {
        hasImages: data.images?.length || 0,
        hasGarden: data.hasGarden,
        hasAnnex: data.hasAnnex,
        hasGate: data.hasGate,
        parkingSpaces: data.parkingSpaces,
        valuationAmount: data.valuationAmount
      }
    }
  });

  return {
    fieldData,
    property: updatedProperty
  };
};

// ============================================
// UPDATE FIELD DATA (for revision requests)
// ============================================

// ============================================
// UPDATE FIELD DATA (for revision requests) - FIXED ENUMS
// ============================================

export const updateFieldData = async (
  collectorId: string,
  fieldDataId: string,
  data: {
    // GPS
    latitude?: number;
    longitude?: number;
    gpsAccuracy?: number;
    // Property features
    propertyType?: string;
    condition?: string;
    bedrooms?: number;
    bathrooms?: number;
    landSize?: number;
    buildingSize?: number;
    yearBuilt?: number;
    parkingSpaces?: number;
    // Garden
    hasGarden?: boolean;
    gardenSize?: number;
    gardenType?: string;
    // Annex
    hasAnnex?: boolean;
    annexType?: string;
    annexSize?: number;
    annexBedrooms?: number;
    annexBathrooms?: number;
    // Gate
    hasGate?: boolean;
    gateType?: string;
    gateMaterial?: string;
    // Fence
    hasFence?: boolean;
    fenceType?: string;
    fenceHeight?: number;
    // Neighborhood
    nearestSchoolKm?: number;
    nearestHospitalKm?: number;
    nearestTransportKm?: number;
    nearestMarketKm?: number;
    roadAccessType?: string;
    // Valuation
    valuationAmount?: number;
    notes?: string;
  }
) => {
  // Check if field data exists and belongs to collector's property
  const fieldData = await prisma.fieldData.findFirst({
    where: {
      id: fieldDataId,
      property: {
        assignment: {
          collectorId
        }
      }
    },
    include: {
      property: true
    }
  });

  if (!fieldData) {
    throw new AppError('Field data not found', 404);
  }

  // Check if property is in NEEDS_REVISION status
  if (fieldData.property.status !== 'NEEDS_REVISION') {
    throw new AppError(`Cannot update: Property status is ${fieldData.property.status}`, 400);
  }

  // Valid enum values
  const validPropertyTypes = ['HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL'];
  const validConditions = ['EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_RENOVATION'];
  const validRoadAccessTypes = ['PAVED', 'UNPAVED', 'DIRT', 'UNDER_CONSTRUCTION'];

  // Build update data
  const updateData: any = {};

  // GPS
  if (data.latitude !== undefined) updateData.latitude = data.latitude;
  if (data.longitude !== undefined) updateData.longitude = data.longitude;
  if (data.gpsAccuracy !== undefined) updateData.gpsAccuracy = data.gpsAccuracy;

  // Property features with enum casting
  if (data.propertyType !== undefined) {
    updateData.propertyType = validPropertyTypes.includes(data.propertyType.toUpperCase())
      ? data.propertyType.toUpperCase() as any
      : null;
  }
  if (data.condition !== undefined) {
    updateData.condition = validConditions.includes(data.condition.toUpperCase())
      ? data.condition.toUpperCase() as any
      : null;
  }
  if (data.bedrooms !== undefined) updateData.bedrooms = data.bedrooms;
  if (data.bathrooms !== undefined) updateData.bathrooms = data.bathrooms;
  if (data.landSize !== undefined) updateData.landSize = data.landSize;
  if (data.buildingSize !== undefined) updateData.buildingSize = data.buildingSize;
  if (data.yearBuilt !== undefined) updateData.yearBuilt = data.yearBuilt;
  if (data.parkingSpaces !== undefined) updateData.parkingSpaces = data.parkingSpaces;

  // Garden
  if (data.hasGarden !== undefined) updateData.hasGarden = data.hasGarden;
  if (data.gardenSize !== undefined) updateData.gardenSize = data.gardenSize;
  if (data.gardenType !== undefined) updateData.gardenType = data.gardenType;

  // Annex
  if (data.hasAnnex !== undefined) updateData.hasAnnex = data.hasAnnex;
  if (data.annexType !== undefined) updateData.annexType = data.annexType;
  if (data.annexSize !== undefined) updateData.annexSize = data.annexSize;
  if (data.annexBedrooms !== undefined) updateData.annexBedrooms = data.annexBedrooms;
  if (data.annexBathrooms !== undefined) updateData.annexBathrooms = data.annexBathrooms;

  // Gate
  if (data.hasGate !== undefined) updateData.hasGate = data.hasGate;
  if (data.gateType !== undefined) updateData.gateType = data.gateType;
  if (data.gateMaterial !== undefined) updateData.gateMaterial = data.gateMaterial;

  // Fence
  if (data.hasFence !== undefined) updateData.hasFence = data.hasFence;
  if (data.fenceType !== undefined) updateData.fenceType = data.fenceType;
  if (data.fenceHeight !== undefined) updateData.fenceHeight = data.fenceHeight;

  // Neighborhood with enum casting
  if (data.roadAccessType !== undefined) {
    updateData.roadAccessType = validRoadAccessTypes.includes(data.roadAccessType.toUpperCase())
      ? data.roadAccessType.toUpperCase() as any
      : null;
  }
  if (data.nearestSchoolKm !== undefined) updateData.nearestSchoolKm = data.nearestSchoolKm;
  if (data.nearestHospitalKm !== undefined) updateData.nearestHospitalKm = data.nearestHospitalKm;
  if (data.nearestTransportKm !== undefined) updateData.nearestTransportKm = data.nearestTransportKm;
  if (data.nearestMarketKm !== undefined) updateData.nearestMarketKm = data.nearestMarketKm;

  // Valuation
  if (data.valuationAmount !== undefined) updateData.valuationAmount = data.valuationAmount;
  if (data.notes !== undefined) updateData.notes = data.notes;

  // Update field data
  const updatedFieldData = await prisma.fieldData.update({
    where: { id: fieldDataId },
    data: { ...updateData, updatedAt: new Date() }
  });

  // Update property status back to UNDER_REVIEW
  await prisma.property.update({
    where: { id: fieldData.propertyId },
    data: { status: 'UNDER_REVIEW' }
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: collectorId,
      action: 'FIELD_DATA_UPDATED',
      entityType: 'FieldData',
      entityId: fieldDataId,
      details: { updatedFields: Object.keys(data) }
    }
  });

  return updatedFieldData;
};
// ============================================
// GET SUBMISSION HISTORY
// ============================================

export const getSubmissionHistory = async (collectorId: string) => {
  const submissions = await prisma.fieldData.findMany({
    where: {
      property: {
        assignment: {
          collectorId
        }
      }
    },
    include: {
      property: {
        select: {
          id: true,
          upiNumber: true,
          ownerName: true,
          province: true,
          district: true,
          status: true
        }
      }
    },
    orderBy: { submittedAt: 'desc' }
  });

  return submissions;
};

// ============================================
// GET REVISION REQUESTS (Properties needing correction)
// ============================================

export const getRevisionRequests = async (collectorId: string, options?: {
  page?: number;
  limit?: number;
}) => {
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const skip = (page - 1) * limit;

  const where: any = {
    assignment: { collectorId },
    status: 'NEEDS_REVISION'
  };

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
        reviews: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            comment: true,
            decision: true,
            createdAt: true,
            supervisor: {
              select: {
                name: true,
                email: true
              }
            }
          }
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