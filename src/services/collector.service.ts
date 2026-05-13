import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import { calculateLiveValuation, saveValuationToProperty } from './valuation.service';
import path from 'path';

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

export const acceptAssignment = async (collectorId: string, propertyId: string) => {

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

  await prisma.assignment.update({
    where: { propertyId },
    data: { verifiedAt: new Date() }
  });

  const updatedProperty = await prisma.property.update({
    where: { id: propertyId },
    data: { status: 'IN_FIELDWORK' }
  });

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

export const submitFieldData = async (
  collectorId: string,
  data: {
    propertyId: string;
    latitude: number;
    longitude: number;
    gpsAccuracy?: number;
    propertyType?: string;
    condition?: string;
    bedrooms?: number;
    bathrooms?: number;
    landSize?: number;
    buildingSize?: number;
    yearBuilt?: number;
    parkingSpaces?: number;
    hasGarden?: boolean;
    gardenSize?: number;
    gardenType?: string;
    hasAnnex?: boolean;
    annexType?: string;
    annexSize?: number;
    annexBedrooms?: number;
    annexBathrooms?: number;
    hasGate?: boolean;
    gateType?: string;
    gateMaterial?: string;
    hasFence?: boolean;
    fenceType?: string;
    fenceHeight?: number;
    nearestSchoolKm?: number;
    nearestHospitalKm?: number;
    nearestTransportKm?: number;
    nearestMarketKm?: number;
    roadAccessType?: string;
    valuationAmount?: number;
    notes?: string;
    images?: { url: string; publicId?: string }[];
  }
) => {
  console.log('=== SUBMIT FIELD DATA START ===');
  console.log('Property ID:', data.propertyId);
  console.log('Collector ID:', collectorId);

  const property = await prisma.property.findFirst({
    where: {
      id: data.propertyId,
      assignment: { collectorId },
      status: { in: ['IN_FIELDWORK', 'UNDER_REVIEW', 'NEEDS_REVISION'] }
    }
  });

  if (!property) {
    throw new AppError('Property not found or not accessible', 404);
  }

  const existingFieldData = await prisma.fieldData.findUnique({
    where: { propertyId: data.propertyId }
  });

  console.log('Existing field data:', existingFieldData ? 'YES' : 'NO');

  let fieldData;
  let isFirstSubmission = false;

  const validPropertyTypes = ['HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL'];
  const validConditions = ['EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_RENOVATION'];
  const validRoadAccessTypes = ['PAVED', 'UNPAVED', 'DIRT', 'UNDER_CONSTRUCTION'];

  const fieldDataInput = {
    propertyId: data.propertyId,
    latitude: data.latitude,
    longitude: data.longitude,
    gpsAccuracy: data.gpsAccuracy,
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
    hasGarden: data.hasGarden || false,
    gardenSize: data.gardenSize,
    gardenType: data.gardenType,
    hasAnnex: data.hasAnnex || false,
    annexType: data.annexType,
    annexSize: data.annexSize,
    annexBedrooms: data.annexBedrooms,
    annexBathrooms: data.annexBathrooms,
    hasGate: data.hasGate || false,
    gateType: data.gateType,
    gateMaterial: data.gateMaterial,
    hasFence: data.hasFence || false,
    fenceType: data.fenceType,
    fenceHeight: data.fenceHeight,
    roadAccessType: data.roadAccessType && validRoadAccessTypes.includes(data.roadAccessType.toUpperCase())
      ? data.roadAccessType.toUpperCase() as any
      : null,
    nearestSchoolKm: data.nearestSchoolKm,
    nearestHospitalKm: data.nearestHospitalKm,
    nearestTransportKm: data.nearestTransportKm,
    nearestMarketKm: data.nearestMarketKm,
    valuationAmount: data.valuationAmount,
    notes: data.notes,
  };

  console.log('Field data input prepared:', {
    landSize: fieldDataInput.landSize,
    buildingSize: fieldDataInput.buildingSize,
    propertyType: fieldDataInput.propertyType,
    district: property.district
  });

  if (existingFieldData) {
    console.log('UPDATING existing field data');
    fieldData = await prisma.fieldData.update({
      where: { propertyId: data.propertyId },
      data: { ...fieldDataInput, updatedAt: new Date() }
    });
  } else {
    console.log('CREATING new field data');
    isFirstSubmission = true;
    fieldData = await prisma.fieldData.create({
      data: { ...fieldDataInput, submittedAt: new Date() }
    });
  }

  console.log('Field data saved. ID:', fieldData.id);

  if (data.images && data.images.length > 0) {
  console.log(`Processing ${data.images.length} images`);
  console.log('Raw images data:', JSON.stringify(data.images, null, 2));

  await prisma.image.deleteMany({ where: { propertyId: data.propertyId } });

  const processedImages = data.images.map((img, index) => {
    let normalizedUrl = img.url;

    if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
      try {
        const urlObj = new URL(normalizedUrl);
        normalizedUrl = urlObj.pathname; 
      } catch (e) {
        console.error('Failed to parse URL:', normalizedUrl);
      }
    }

    if (!normalizedUrl.startsWith('/uploads/')) {
      if (normalizedUrl.startsWith('uploads/')) {
        normalizedUrl = '/' + normalizedUrl;
      } else {
        normalizedUrl = `/uploads/properties/${normalizedUrl.replace(/^\/+/, '')}`;
      }
    }
    
    console.log(`Image ${index}: Original URL: ${img.url} -> Normalized URL: ${normalizedUrl}`);
    
    return {
      propertyId: data.propertyId,
      url: normalizedUrl,
      publicId: img.publicId || path.basename(normalizedUrl),
      order: index,
      isFeatured: index === 0,
      uploadedBy: collectorId
    };
  });
  
  await prisma.image.createMany({
    data: processedImages
  });
  console.log('Images saved with normalized URLs');
}

  console.log('=== STARTING AI VALUATION CALCULATION ===');

  const determinePropertyQuality = (propertyType: string, condition: string, buildingSize: number): 'BASIC' | 'STANDARD' | 'LUXURY' => {
    if (propertyType === 'VILLA' || (buildingSize > 500 && condition === 'EXCELLENT')) return 'LUXURY';
    if (propertyType === 'HOUSE' || buildingSize > 200 || condition === 'GOOD') return 'STANDARD';
    return 'BASIC';
  };

  const determinePropertyCategory = (propertyType: string): 'RESIDENTIAL' | 'COMMERCIAL' | 'LAND' | 'AGRICULTURAL' => {
    if (propertyType === 'COMMERCIAL') return 'COMMERCIAL';
    if (propertyType === 'LAND') return 'LAND';
    if (propertyType === 'AGRICULTURAL') return 'AGRICULTURAL';
    return 'RESIDENTIAL';
  };

  const propertyTypeStr = fieldData.propertyType as string || 'RESIDENTIAL';
  const conditionStr = fieldData.condition as string || 'GOOD';
  const buildingSizeNum = fieldData.buildingSize || 0;

  console.log('Property characteristics:', {
    propertyTypeStr,
    conditionStr,
    buildingSizeNum,
    landSize: fieldData.landSize,
    district: property.district,
    bedrooms: fieldData.bedrooms,
    bathrooms: fieldData.bathrooms
  });

  const valuationInput = {
    landSize: fieldData.landSize || 0,
    buildingSize: buildingSizeNum,
    yearBuilt: fieldData.yearBuilt || new Date().getFullYear(),
    propertyType: determinePropertyQuality(propertyTypeStr, conditionStr, buildingSizeNum),
    propertyCategory: determinePropertyCategory(propertyTypeStr),
    bedrooms: fieldData.bedrooms || 0,
    bathrooms: fieldData.bathrooms || 0,
    gardenSize: fieldData.gardenSize || 0,
    fenceHeight: fieldData.fenceHeight || 0,
    gateType: fieldData.gateType as 'AUTOMATIC' | 'SLIDING' | 'SWING' | 'MANUAL' || null,
    parkingSpaces: fieldData.parkingSpaces || 0,
    hasElectricity: true,
    hasWaterSupply: true,
    hasWaterTank: false,
    floodRisk: false,
    landSlope: 'Flat' as const,
    floorMaterial: 'Cement' as const,
    roofType: 'Iron sheets' as const,
    district: property.district,
    nearestSchoolKm: fieldData.nearestSchoolKm || 2,
    nearestHospitalKm: fieldData.nearestHospitalKm || 3,
    nearestTransportKm: fieldData.nearestTransportKm || 1,
    nearestMarketKm: fieldData.nearestMarketKm || 1.5,
    roadAccessType: (fieldData.roadAccessType as 'PAVED' | 'UNPAVED' | 'DIRT' | 'UNDER_CONSTRUCTION') || 'UNPAVED',
  };

  const valuation = calculateLiveValuation(valuationInput);
  
  const estimatedValue = valuation?.estimatedValue || 0;
  const confidenceScore = valuation?.confidenceScore || 0;

  const updatedProperty = await prisma.property.update({
    where: { id: data.propertyId },
    data: { 
      status: isFirstSubmission ? 'UNDER_REVIEW' : property.status,
      aiValuation: estimatedValue,
      aiConfidence: confidenceScore,
      aiFactors: valuation?.breakdown as any 
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: collectorId,
      action: existingFieldData ? 'FIELD_DATA_UPDATED' : 'FIELD_DATA_SUBMITTED',
      entityType: 'Property',
      entityId: data.propertyId,
      details: {
        hasImages: data.images?.length || 0,
        isUpdate: !!existingFieldData,
        valuationAmount: data.valuationAmount,
        aiValuation: estimatedValue,
        aiConfidence: confidenceScore
      }
    }
  });
  return {
    fieldData,
    property: updatedProperty,
    aiValuation: {
      estimatedValue: estimatedValue,
      confidenceScore: confidenceScore,
      priceRange: valuation?.priceRange,
      breakdown: valuation?.breakdown
    },
    isUpdate: !!existingFieldData
  };
};

export const updateFieldData = async (
  collectorId: string,
  fieldDataId: string,
  data: {
    latitude?: number;
    longitude?: number;
    gpsAccuracy?: number;
    propertyType?: string;
    condition?: string;
    bedrooms?: number;
    bathrooms?: number;
    landSize?: number;
    buildingSize?: number;
    yearBuilt?: number;
    parkingSpaces?: number;
    hasGarden?: boolean;
    gardenSize?: number;
    gardenType?: string;
    hasAnnex?: boolean;
    annexType?: string;
    annexSize?: number;
    annexBedrooms?: number;
    annexBathrooms?: number;
    hasGate?: boolean;
    gateType?: string;
    gateMaterial?: string;
    hasFence?: boolean;
    fenceType?: string;
    fenceHeight?: number;
    nearestSchoolKm?: number;
    nearestHospitalKm?: number;
    nearestTransportKm?: number;
    nearestMarketKm?: number;
    roadAccessType?: string;
    valuationAmount?: number;
    notes?: string;
  }
) => {

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

 if (fieldData.property.status !== 'NEEDS_REVISION' && fieldData.property.status !== 'UNDER_REVIEW') {
  throw new AppError(`Cannot update: Property status is ${fieldData.property.status}`, 400);
}

  const validPropertyTypes = ['HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL'];
  const validConditions = ['EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_RENOVATION'];
  const validRoadAccessTypes = ['PAVED', 'UNPAVED', 'DIRT', 'UNDER_CONSTRUCTION'];
  const updateData: any = {};

  if (data.latitude !== undefined) updateData.latitude = data.latitude;
  if (data.longitude !== undefined) updateData.longitude = data.longitude;
  if (data.gpsAccuracy !== undefined) updateData.gpsAccuracy = data.gpsAccuracy;

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
  if (data.hasGarden !== undefined) updateData.hasGarden = data.hasGarden;
  if (data.gardenSize !== undefined) updateData.gardenSize = data.gardenSize;
  if (data.gardenType !== undefined) updateData.gardenType = data.gardenType;
  if (data.hasAnnex !== undefined) updateData.hasAnnex = data.hasAnnex;
  if (data.annexType !== undefined) updateData.annexType = data.annexType;
  if (data.annexSize !== undefined) updateData.annexSize = data.annexSize;
  if (data.annexBedrooms !== undefined) updateData.annexBedrooms = data.annexBedrooms;
  if (data.annexBathrooms !== undefined) updateData.annexBathrooms = data.annexBathrooms;
  if (data.hasGate !== undefined) updateData.hasGate = data.hasGate;
  if (data.gateType !== undefined) updateData.gateType = data.gateType;
  if (data.gateMaterial !== undefined) updateData.gateMaterial = data.gateMaterial;
  if (data.hasFence !== undefined) updateData.hasFence = data.hasFence;
  if (data.fenceType !== undefined) updateData.fenceType = data.fenceType;
  if (data.fenceHeight !== undefined) updateData.fenceHeight = data.fenceHeight;
  if (data.roadAccessType !== undefined) {
    updateData.roadAccessType = validRoadAccessTypes.includes(data.roadAccessType.toUpperCase())
      ? data.roadAccessType.toUpperCase() as any
      : null;
  }
  if (data.nearestSchoolKm !== undefined) updateData.nearestSchoolKm = data.nearestSchoolKm;
  if (data.nearestHospitalKm !== undefined) updateData.nearestHospitalKm = data.nearestHospitalKm;
  if (data.nearestTransportKm !== undefined) updateData.nearestTransportKm = data.nearestTransportKm;
  if (data.nearestMarketKm !== undefined) updateData.nearestMarketKm = data.nearestMarketKm;
  if (data.valuationAmount !== undefined) updateData.valuationAmount = data.valuationAmount;
  if (data.notes !== undefined) updateData.notes = data.notes;
  const updatedFieldData = await prisma.fieldData.update({
    where: { id: fieldDataId },
    data: { ...updateData, updatedAt: new Date() }
  });
  await prisma.property.update({
    where: { id: fieldData.propertyId },
    data: { status: 'UNDER_REVIEW' }
  });

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