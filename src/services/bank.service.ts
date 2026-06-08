import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import { sendAccessRequestEmail, sendAccessApprovedEmail } from '../config/email';

const excludeSynthetic = {
  upiNumber: {
    not: { startsWith: 'SYN-' }
  }
};

// Get bank dashboard statistics
// Get bank dashboard statistics - FIXED to include both association and direct access
export const getBankDashboardStats = async (bankId: string) => {
  // Get all clients associated with this bank
  const associatedClients = await prisma.user.findMany({
    where: {
      bankId: bankId,
      role: 'CLIENT'
    },
    select: { id: true }
  });

  const associatedClientIds = associatedClients.map(c => c.id);

  // Get all properties where bank has direct access (approved access requests)
  const directAccessProperties = await prisma.propertyAccess.findMany({
    where: {
      institutionId: bankId,
      clientConsent: true
    },
    select: {
      propertyId: true
    }
  });

  const directAccessPropertyIds = directAccessProperties.map(p => p.propertyId);

  // Get properties from associated clients
  const clientProperties = associatedClientIds.length > 0
    ? await prisma.property.findMany({
        where: { clientId: { in: associatedClientIds }, ...excludeSynthetic },
        select: { id: true, status: true, aiValuation: true, createdAt: true }
      })
    : [];

  // Get properties from direct access
  const directProperties = directAccessPropertyIds.length > 0
    ? await prisma.property.findMany({
        where: { id: { in: directAccessPropertyIds }, ...excludeSynthetic },
        select: { id: true, status: true, aiValuation: true, createdAt: true }
      })
    : [];

  // Combine and deduplicate properties
  const allPropertiesMap = new Map();
  [...clientProperties, ...directProperties].forEach(prop => {
    if (!allPropertiesMap.has(prop.id)) {
      allPropertiesMap.set(prop.id, prop);
    }
  });
  const allProperties = Array.from(allPropertiesMap.values());

  const totalProperties = allProperties.length;
  const pendingApproval = allProperties.filter(p => p.status === 'UNDER_REVIEW').length;
  const completed = allProperties.filter(p => p.status === 'APPROVED' || p.status === 'PUBLISHED').length;
  
  const totalValue = allProperties.reduce((sum, p) => sum + (p.aiValuation || 0), 0);
  const averageValue = totalProperties > 0 ? totalValue / totalProperties : 0;

  // Get pending access requests
  const pendingAccessRequests = await prisma.propertyAccess.findMany({
    where: {
      institutionId: bankId,
      clientConsent: null,
      accessRequestedAt: { not: null }
    },
    include: {
      property: {
        include: {
          client: { select: { name: true, email: true } }
        }
      }
    },
    take: 5,
    orderBy: { accessRequestedAt: 'desc' }
  });

  // Get recent properties (last 10)
  const recentProperties = allProperties
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map(async (prop) => {
      // Fetch full property details with relations
      const fullProperty = await prisma.property.findUnique({
        where: { id: prop.id },
        include: {
          client: { select: { name: true, email: true, phone: true } },
          fieldData: { select: { valuationAmount: true, buildingSize: true, landSize: true } },
          images: { where: { isFeatured: true }, take: 1, select: { url: true } }
        }
      });
      return fullProperty;
    });

  const resolvedRecentProperties = (await Promise.all(recentProperties)).filter(Boolean);

  return {
    counts: {
      totalProperties,
      pendingApproval,
      completed,
      averageValue: Math.round(averageValue)
    },
    recentProperties: resolvedRecentProperties,
    pendingAccessRequests: pendingAccessRequests.map(req => ({
      id: req.id,
      propertyId: req.propertyId,
      upiNumber: req.property.upiNumber,
      ownerName: req.property.ownerName,
      clientName: req.property.client?.name,
      requestedAt: req.accessRequestedAt,
      accessType: req.accessType
    }))
  };
};

// Search for property by UPI
export const searchProperty = async (bankId: string, upiNumber: string) => {
  const property = await prisma.property.findFirst({
    where: {
      upiNumber: {
        contains: upiNumber,
        mode: 'insensitive',
        not: { startsWith: 'SYN-' }
      }
    },
    select: {
      id: true,
      upiNumber: true,
      ownerName: true,
      district: true,
      province: true,
      status: true,
      clientId: true,
      client: {
        select: { name: true, email: true }
      },
      isPublic: true,
      sharedWith: {
        where: { institutionId: bankId },
        select: { accessType: true, clientConsent: true, id: true }
      }
    }
  });

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  // Check if bank already has access
  const existingAccess = property.sharedWith[0];
  const hasAccess = existingAccess?.clientConsent === true;
  const accessRequested = existingAccess?.clientConsent === null;
  const accessType = existingAccess?.accessType;

  // Determine what bank can see based on property status
  const canView = hasAccess || property.isPublic;
  const canTrack = hasAccess && (property.status !== 'PENDING' && property.status !== 'ASSIGNED');
  const canViewValuation = hasAccess && (property.status === 'APPROVED' || property.status === 'PUBLISHED');

  // Get property status display
  const getStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; description: string }> = {
      'PENDING': { label: 'Pending Assignment', description: 'Waiting for data collector assignment' },
      'ASSIGNED': { label: 'Assigned', description: 'Data collector assigned but not yet accepted' },
      'IN_FIELDWORK': { label: 'Fieldwork in Progress', description: 'Data collector is on site collecting information' },
      'UNDER_REVIEW': { label: 'Under Review', description: 'Field data submitted, awaiting supervisor approval' },
      'APPROVED': { label: 'Approved', description: 'Valuation approved by supervisor' },
      'PUBLISHED': { label: 'Published', description: 'Final valuation report available' }
    };
    return statusMap[status] || { label: status, description: '' };
  };

  return {
    property: {
      id: property.id,
      upiNumber: property.upiNumber,
      ownerName: property.ownerName,
      district: property.district,
      province: property.province,
      status: property.status,
      statusDisplay: getStatusDisplay(property.status),
      isPublic: property.isPublic
    },
    bankAccess: {
      hasAccess,
      accessRequested,
      accessType,
      canView,
      canTrack,
      canViewValuation
    },
    client: canView ? { name: property.client?.name, email: property.client?.email } : undefined
  };
};

// Request access to a property
export const requestPropertyAccess = async (
  bankId: string,
  propertyId: string,
  accessType: string = 'TRACK_PROGRESS',
  message?: string
) => {
  const property = await prisma.property.findFirst({
    where: { id: propertyId },
    include: { client: true }
  });

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  // Don't allow access requests for pending or assigned properties
  if (property.status === 'PENDING' || property.status === 'ASSIGNED') {
    throw new AppError('Access cannot be requested until property is under review', 400);
  }

  // Check if access already exists
  const existingAccess = await prisma.propertyAccess.findUnique({
    where: {
      propertyId_institutionId: {
        propertyId: propertyId,
        institutionId: bankId
      }
    }
  });

  if (existingAccess) {
    if (existingAccess.clientConsent === true) {
      throw new AppError('You already have access to this property', 400);
    }
    if (existingAccess.clientConsent === null) {
      throw new AppError('Access request already pending. Waiting for client approval.', 400);
    }
  }

  const bank = await prisma.user.findUnique({
    where: { id: bankId },
    select: { name: true, email: true }
  });

  if (!bank) {
    throw new AppError('Bank not found', 404);
  }

  // Create access request
  const access = await prisma.propertyAccess.upsert({
    where: {
      propertyId_institutionId: {
        propertyId: propertyId,
        institutionId: bankId
      }
    },
    update: {
      accessType: accessType as any,
      accessRequestedAt: new Date(),
      clientConsent: null,
      grantedBy: bankId
    },
    create: {
      propertyId,
      institutionId: bankId,
      accessType: accessType as any,
      accessRequestedAt: new Date(),
      grantedBy: bankId,
      clientId: property.clientId,
      clientConsent: null
    },
    include: {
      property: {
        include: {
          client: true
        }
      }
    }
  });

  // Send email to client
  try {
    await sendAccessRequestEmail(
      property.client?.email || '',
      property.client?.name || 'Client',
      bank.name,
      property.upiNumber,
      accessType,
      message
    );
  } catch (emailError) {
    console.error('Failed to send access request email:', emailError);
  }

  return {
    success: true,
    message: 'Access request sent to client. You will be notified when they approve.',
    access: {
      id: access.id,
      status: 'pending',
      requestedAt: access.accessRequestedAt
    }
  };
};

export const getPropertyTracking = async (bankId: string, propertyId: string) => {
  // Verify bank has access
  const access = await prisma.propertyAccess.findFirst({
    where: {
      propertyId,
      institutionId: bankId,
      clientConsent: true
    }
  });

  if (!access) {
    throw new AppError('You do not have access to this property. Please request access from the client.', 403);
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      client: { select: { name: true, email: true, phone: true } },
      fieldData: true,
      assignment: {
        include: {
          collector: { select: { name: true, email: true, phone: true } },
          assignedBy: { select: { name: true } }
        }
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        include: { supervisor: { select: { name: true } } }
      },
      images: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          url: true,
          isFeatured: true,
          order: true
        }
      }
    }
  });

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  // Format images for frontend
  const formattedImages = property.images?.map(img => ({
    id: img.id,
    url: img.url,
    isFeatured: img.isFeatured,
    order: img.order
  })) || [];

  // Define progress steps - NO PUBLISHED
  const steps = [
    { name: 'Application Submitted', key: 'submitted', order: 1 },
    { name: 'Assigned to Collector', key: 'assigned', order: 2 },
    { name: 'Fieldwork in Progress', key: 'fieldwork', order: 3 },
    { name: 'Under Review', key: 'review', order: 4 },
    { name: 'Approved', key: 'approved', order: 5 }
  ];

  // Determine step statuses
  const stepStatuses = {
    submitted: property.createdAt ? 'completed' : 'pending',
    assigned: property.assignment?.assignedAt ? 'completed' : 'pending',
    fieldwork: property.assignment?.verifiedAt ? 'completed' : 'pending',
    review: property.fieldData?.submittedAt ? 'completed' : 'pending',
    approved: property.status === 'APPROVED' ? 'completed' : 'pending'
  };

  // Find current step
  let currentStepIndex = 0;
  for (let i = 0; i < steps.length; i++) {
    const stepKey = steps[i].key as keyof typeof stepStatuses;
    if (stepStatuses[stepKey] !== 'completed') {
      currentStepIndex = i;
      break;
    }
    if (i === steps.length - 1) {
      currentStepIndex = steps.length;
    }
  }

  const completedSteps = steps.filter(s => stepStatuses[s.key as keyof typeof stepStatuses] === 'completed').length;
  // When property is APPROVED, progress should be 100%
  let progressPercentage = (completedSteps / steps.length) * 100;
  
  // If property is APPROVED, force 100% even if something is off
  if (property.status === 'APPROVED') {
    progressPercentage = 100;
  }

  // Calculate estimated time left
  let estimatedHoursLeft = 0;
  let estimatedDaysLeft = 0;
  let estimatedCompletionDate = new Date();

  if (property.status !== 'APPROVED') {
    const averageDaysPerStep = 2;
    const stepsLeft = steps.length - completedSteps;
    estimatedDaysLeft = stepsLeft * averageDaysPerStep;
    estimatedHoursLeft = estimatedDaysLeft * 8;
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + estimatedDaysLeft);
  } else {
    // If already approved, completion date is the approval date
    estimatedCompletionDate = property.updatedAt;
    estimatedHoursLeft = 0;
    estimatedDaysLeft = 0;
  }

  // Build timeline (same as before, but no published stage)
  const timeline = [];

  if (property.createdAt) {
    timeline.push({
      stage: 'Application Submitted',
      status: 'completed',
      date: property.createdAt,
      details: `Property submitted by ${property.client?.name || property.ownerName}`,
      icon: '📋'
    });
  }

  if (property.assignment?.assignedAt) {
    timeline.push({
      stage: 'Assigned to Data Collector',
      status: property.assignment.verifiedAt ? 'completed' : 'current',
      date: property.assignment.assignedAt,
      details: `Assigned to ${property.assignment.collector?.name || 'a data collector'}`,
      icon: '👤'
    });
  }

  if (property.assignment?.verifiedAt) {
    timeline.push({
      stage: 'Collector Accepted & Fieldwork Started',
      status: property.fieldData?.submittedAt ? 'completed' : 'current',
      date: property.assignment.verifiedAt,
      details: `${property.assignment.collector?.name} accepted and started fieldwork`,
      icon: '📍'
    });
  }

  if (property.fieldData?.submittedAt) {
    timeline.push({
      stage: 'Field Data Submitted',
      status: property.status !== 'IN_FIELDWORK' ? 'completed' : 'current',
      date: property.fieldData.submittedAt,
      details: `Field data submitted for review`,
      icon: '📊'
    });
  }

  if (property.status === 'UNDER_REVIEW') {
    timeline.push({
      stage: 'Under Review',
      status: 'current',
      date: property.updatedAt,
      details: `Supervisor is reviewing the valuation`,
      icon: '🔍'
    });
  } else if (property.reviews.length > 0) {
    timeline.push({
      stage: property.reviews[0].decision === 'APPROVED' ? 'Approved' : 'Needs Revision',
      status: 'completed',
      date: property.reviews[0].createdAt,
      details: property.reviews[0].comment || `Property was ${property.reviews[0].decision}`,
      icon: property.reviews[0].decision === 'APPROVED' ? '✅' : '🔄'
    });
  }

  return {
    property: {
      id: property.id,
      upiNumber: property.upiNumber,
      ownerName: property.ownerName,
      status: property.status,
      aiValuation: property.aiValuation,
      fieldValuation: property.fieldData?.valuationAmount
    },
    client: {
      name: property.client?.name,
      email: property.client?.email,
      phone: property.client?.phone,
    },
    progress: {
      percentage: Math.round(progressPercentage),
      currentStep: steps[currentStepIndex]?.name || 'Complete',
      currentStepIndex: currentStepIndex + 1,
      completedSteps: property.status === 'APPROVED' ? steps.length : completedSteps,
      totalSteps: steps.length,
      estimatedHoursLeft: Math.max(0, estimatedHoursLeft),
      estimatedDaysLeft: Math.max(0, estimatedDaysLeft),
      estimatedCompletionDate: estimatedCompletionDate.toISOString(),
    },
    steps: steps.map(step => ({
      name: step.name,
      status: stepStatuses[step.key as keyof typeof stepStatuses],
      order: step.order
    })),
    timeline,
    images: formattedImages,  // ADD IMAGES HERE
    preliminaryInfo: property.fieldData ? {
      landSize: property.fieldData.landSize,
      buildingSize: property.fieldData.buildingSize,
      propertyType: property.fieldData.propertyType,
      bedrooms: property.fieldData.bedrooms,
      bathrooms: property.fieldData.bathrooms,
      condition: property.fieldData.condition,
      hasSwimmingPool: property.fieldData.hasSwimmingPool,
      hasGym: property.fieldData.hasGym,
      hasSmartHome: property.fieldData.hasSmartHome,
      hasSolarPanels: property.fieldData.hasSolarPanels,
      viewType: property.fieldData.viewType,
      hasGarden: property.fieldData.hasGarden,
      gardenSize: property.fieldData.gardenSize,
      hasGate: property.fieldData.hasGate,
      gateType: property.fieldData.gateType,
      hasFence: property.fieldData.hasFence,
      fenceHeight: property.fieldData.fenceHeight,
      parkingSpaces: property.fieldData.parkingSpaces,
      nearestSchoolKm: property.fieldData.nearestSchoolKm,
      nearestHospitalKm: property.fieldData.nearestHospitalKm,
      roadAccessType: property.fieldData.roadAccessType
    } : null
  };
};
// Get final valuation (for approved/published properties)
export const getPropertyValuation = async (bankId: string, propertyId: string) => {
  const access = await prisma.propertyAccess.findFirst({
    where: {
      propertyId,
      institutionId: bankId,
      clientConsent: true
    }
  });

  if (!access) {
    throw new AppError('You do not have access to this property. Please request access from the client.', 403);
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      client: { select: { name: true, email: true, phone: true } },
      fieldData: true,
      assignment: {
        include: {
          collector: { select: { name: true, email: true } },
          assignedBy: { select: { name: true, email: true } }
        }
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { supervisor: { select: { name: true, email: true } } }
      },
      images: {
        where: { isFeatured: true },
        take: 3,
        select: { url: true }
      }
    }
  });

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  if (property.status !== 'APPROVED' && property.status !== 'PUBLISHED') {
    throw new AppError('Valuation not yet available. Property is still in progress.', 400);
  }

  const finalValue = property.aiValuation || property.fieldData?.valuationAmount;

  return {
    property: {
      upiNumber: property.upiNumber,
      ownerName: property.ownerName,
      district: property.district,
      province: property.province,
      sector: property.sector,
      cell: property.cell,
      village: property.village,
      status: property.status
    },
    client: {
      name: property.client?.name,
      email: property.client?.email,
      phone: property.client?.phone
    },
    valuation: {
      finalValue: finalValue,
      formattedValue: new Intl.NumberFormat('rw-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0 }).format(finalValue || 0),
      confidenceScore: property.aiConfidence,
      approvedBy: property.reviews[0]?.supervisor?.name,
      approvedAt: property.reviews[0]?.createdAt,
      publishedAt: property.publishedAt,
      valuationDate: property.updatedAt
    },
    propertyDetails: property.fieldData ? {
      landSize: property.fieldData.landSize,
      buildingSize: property.fieldData.buildingSize,
      propertyType: property.fieldData.propertyType,
      bedrooms: property.fieldData.bedrooms,
      bathrooms: property.fieldData.bathrooms,
      condition: property.fieldData.condition,
      yearBuilt: property.fieldData.yearBuilt,
      parkingSpaces: property.fieldData.parkingSpaces,
      hasSwimmingPool: property.fieldData.hasSwimmingPool,
      hasGym: property.fieldData.hasGym,
      hasSmartHome: property.fieldData.hasSmartHome,
      hasSolarPanels: property.fieldData.hasSolarPanels,
      viewType: property.fieldData.viewType,
      hasGarden: property.fieldData.hasGarden,
      gardenSize: property.fieldData.gardenSize,
      hasGate: property.fieldData.hasGate,
      gateType: property.fieldData.gateType,
      hasFence: property.fieldData.hasFence,
      fenceHeight: property.fieldData.fenceHeight,
      nearestSchoolKm: property.fieldData.nearestSchoolKm,
      nearestHospitalKm: property.fieldData.nearestHospitalKm,
      roadAccessType: property.fieldData.roadAccessType
    } : null,
    images: property.images?.map(img => ({ url: img.url })) || [],
    generatedAt: new Date().toISOString()
  };
};

// Get all properties bank has access to
// Get all properties bank has access to - FIXED for pagination
export const getBankProperties = async (
  bankId: string,
  options: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  }
) => {
  const page = options?.page || 1;
  const limit = options?.limit || 10;
  const skip = (page - 1) * limit;

  // Get properties from direct access (approved)
  const directAccess = await prisma.propertyAccess.findMany({
    where: {
      institutionId: bankId,
      clientConsent: true
    },
    include: {
      property: {
        include: {
          client: { select: { name: true, email: true } },
          fieldData: { select: { valuationAmount: true, landSize: true, buildingSize: true } },
          images: { where: { isFeatured: true }, take: 1, select: { url: true } },
          assignment: {
            include: {
              collector: { select: { name: true } }
            }
          }
        }
      }
    }
  });

  // Get properties from associated clients
  const associatedClients = await prisma.user.findMany({
    where: {
      bankId: bankId,
      role: 'CLIENT'
    },
    select: { id: true }
  });

  const associatedClientIds = associatedClients.map(c => c.id);

  const clientProperties = associatedClientIds.length > 0
    ? await prisma.property.findMany({
        where: { 
          clientId: { in: associatedClientIds },
          ...excludeSynthetic
        },
        include: {
          client: { select: { name: true, email: true } },
          fieldData: { select: { valuationAmount: true, landSize: true, buildingSize: true } },
          images: { where: { isFeatured: true }, take: 1, select: { url: true } },
          assignment: {
            include: {
              collector: { select: { name: true } }
            }
          }
        }
      })
    : [];

  // Combine and deduplicate
  const propertiesMap = new Map();
  
  directAccess.forEach(access => {
    if (access.property && !propertiesMap.has(access.property.id)) {
      propertiesMap.set(access.property.id, {
        ...access.property,
        accessType: access.accessType,
        grantedAt: access.grantedAt
      });
    }
  });
  
  clientProperties.forEach(property => {
    if (!propertiesMap.has(property.id)) {
      propertiesMap.set(property.id, {
        ...property,
        accessType: 'FULL_ACCESS',
        grantedAt: property.createdAt
      });
    }
  });

  let allProperties = Array.from(propertiesMap.values());

  // Apply filters
  if (options?.status && options.status !== 'ALL') {
    allProperties = allProperties.filter(p => p.status === options.status);
  }

  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    allProperties = allProperties.filter(p => 
      p.upiNumber?.toLowerCase().includes(searchLower) ||
      p.ownerName?.toLowerCase().includes(searchLower) ||
      p.client?.name?.toLowerCase().includes(searchLower)
    );
  }

  // Sort by grantedAt (most recent first)
  allProperties.sort((a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime());

  const total = allProperties.length;
  const paginatedProperties = allProperties.slice(skip, skip + limit);

  return {
    properties: paginatedProperties,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};
// Get pending access requests for bank
export const getPendingAccessRequests = async (bankId: string) => {
  const pendingRequests = await prisma.propertyAccess.findMany({
    where: {
      institutionId: bankId,
      clientConsent: null,
      accessRequestedAt: { not: null }
    },
    include: {
      property: {
        include: {
          client: { select: { name: true, email: true, phone: true } }
        }
      }
    },
    orderBy: { accessRequestedAt: 'desc' }
  });

  return pendingRequests.map(req => ({
    id: req.id,
    propertyId: req.propertyId,
    upiNumber: req.property.upiNumber,
    ownerName: req.property.ownerName,
    clientName: req.property.client?.name,
    clientEmail: req.property.client?.email,
    requestedAt: req.accessRequestedAt,
    accessType: req.accessType,
    status: 'pending'
  }));
};