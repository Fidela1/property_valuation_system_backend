import { Request, Response } from 'express';
import * as collectorService from '../services/collector.service';
import { AppError } from '../utils/AppError';

interface AuthRequest extends Request {
  authenticatedUser?: {
    id: string;
    email: string;
    role: string;
  };
}

// ============================================
// GET COLLECTOR DASHBOARD STATS
// ============================================

export const getCollectorStats = async (req: AuthRequest, res: Response) => {
  try {
    const collectorId = req.authenticatedUser?.id;

    if (!collectorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const stats = await collectorService.getCollectorStats(collectorId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get collector stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
};

// ============================================
// GET ASSIGNED PROPERTIES
// ============================================

export const getAssignedProperties = async (req: AuthRequest, res: Response) => {
  try {
    const collectorId = req.authenticatedUser?.id;

    if (!collectorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const { status, page, limit } = req.query;

    const result = await collectorService.getAssignedProperties(collectorId, {
      status: status as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10
    });

    res.json({
      success: true,
      data: {
        properties: result.properties,
        pagination: result.pagination
      }
    });
  } catch (error) {
    console.error('Get assigned properties error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assigned properties'
    });
  }
};

// ============================================
// GET ASSIGNMENT BY ID
// ============================================

export const getAssignmentById = async (req: AuthRequest, res: Response) => {
  try {
    const collectorId = req.authenticatedUser?.id;
      let { id } = req.params;
    
     if (Array.isArray(id)) {
      id = id[0];
    }

    if (!collectorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const assignment = await collectorService.getAssignmentById(collectorId, id);

    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    if (error instanceof AppError && error.message === 'Assignment not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    console.error('Get assignment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assignment'
    });
  }
};

// ============================================
// ACCEPT ASSIGNMENT
// ============================================

export const acceptAssignment = async (req: AuthRequest, res: Response) => {
  try {
    const collectorId = req.authenticatedUser?.id;
      let { id } = req.params;
    
     if (Array.isArray(id)) {
      id = id[0];
    }

    if (!collectorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const property = await collectorService.acceptAssignment(collectorId, id);

    res.json({
      success: true,
      message: 'Assignment accepted successfully',
      data: property
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }

    console.error('Accept assignment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept assignment'
    });
  }
};

// ============================================
// SUBMIT FIELD DATA (with surroundings)
// ============================================

export const submitFieldData = async (req: AuthRequest, res: Response) => {
  try {
    const collectorId = req.authenticatedUser?.id;

    if (!collectorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const {
      propertyId,
      latitude,
      longitude,
      gpsAccuracy,
      // Property features
      propertyType,
      condition,
      bedrooms,
      bathrooms,
      landSize,
      buildingSize,
      yearBuilt,
      parkingSpaces,
      // Garden
      hasGarden,
      gardenSize,
      gardenType,
      // Annex
      hasAnnex,
      annexType,
      annexSize,
      annexBedrooms,
      annexBathrooms,
      // Gate
      hasGate,
      gateType,
      gateMaterial,
      // Fence
      hasFence,
      fenceType,
      fenceHeight,
      // Neighborhood
      nearestSchoolKm,
      nearestHospitalKm,
      nearestTransportKm,
      nearestMarketKm,
      roadAccessType,
      // Valuation
      valuationAmount,
      notes,
      images
    } = req.body;

    // Validate required fields
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: 'Property ID is required'
      });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'GPS coordinates are required'
      });
    }

    const result = await collectorService.submitFieldData(collectorId, {
      propertyId,
      latitude,
      longitude,
      gpsAccuracy: gpsAccuracy ? Number(gpsAccuracy) : undefined,
      // Property features
      propertyType,
      condition,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      landSize: landSize ? Number(landSize) : undefined,
      buildingSize: buildingSize ? Number(buildingSize) : undefined,
      yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
      parkingSpaces: parkingSpaces ? Number(parkingSpaces) : undefined,
      // Garden
      hasGarden: hasGarden === true || hasGarden === 'true',
      gardenSize: gardenSize ? Number(gardenSize) : undefined,
      gardenType,
      // Annex
      hasAnnex: hasAnnex === true || hasAnnex === 'true',
      annexType,
      annexSize: annexSize ? Number(annexSize) : undefined,
      annexBedrooms: annexBedrooms ? Number(annexBedrooms) : undefined,
      annexBathrooms: annexBathrooms ? Number(annexBathrooms) : undefined,
      // Gate
      hasGate: hasGate === true || hasGate === 'true',
      gateType,
      gateMaterial,
      // Fence
      hasFence: hasFence === true || hasFence === 'true',
      fenceType,
      fenceHeight: fenceHeight ? Number(fenceHeight) : undefined,
      // Neighborhood
      nearestSchoolKm: nearestSchoolKm ? Number(nearestSchoolKm) : undefined,
      nearestHospitalKm: nearestHospitalKm ? Number(nearestHospitalKm) : undefined,
      nearestTransportKm: nearestTransportKm ? Number(nearestTransportKm) : undefined,
      nearestMarketKm: nearestMarketKm ? Number(nearestMarketKm) : undefined,
      roadAccessType,
      // Valuation
      valuationAmount: valuationAmount ? Number(valuationAmount) : undefined,
      notes,
      images: images || []
    });

    res.status(201).json({
      success: true,
      message: 'Field data submitted successfully. Property is now under review.',
      data: result
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }

    console.error('Submit field data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit field data'
    });
  }
};

// ============================================
// UPDATE FIELD DATA (for revision)
// ============================================

export const updateFieldData = async (req: AuthRequest, res: Response) => {
  try {
    const collectorId = req.authenticatedUser?.id;
      let { id } = req.params;
    
    const {
      // GPS
      latitude,
      longitude,
      gpsAccuracy,
      // Property features
      propertyType,
      condition,
      bedrooms,
      bathrooms,
      landSize,
      buildingSize,
      yearBuilt,
      parkingSpaces,
      // Garden
      hasGarden,
      gardenSize,
      gardenType,
      // Annex
      hasAnnex,
      annexType,
      annexSize,
      annexBedrooms,
      annexBathrooms,
      // Gate
      hasGate,
      gateType,
      gateMaterial,
      // Fence
      hasFence,
      fenceType,
      fenceHeight,
      // Neighborhood
      nearestSchoolKm,
      nearestHospitalKm,
      nearestTransportKm,
      nearestMarketKm,
      roadAccessType,
      // Valuation
      valuationAmount,
      notes
    } = req.body;

    if (!collectorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    if (Array.isArray(id)) {
      id = id[0];
    }
    
    const fieldData = await collectorService.updateFieldData(collectorId, id, {
      // GPS
      latitude,
      longitude,
      gpsAccuracy: gpsAccuracy ? Number(gpsAccuracy) : undefined,
      // Property features
      propertyType,
      condition,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      landSize: landSize ? Number(landSize) : undefined,
      buildingSize: buildingSize ? Number(buildingSize) : undefined,
      yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
      parkingSpaces: parkingSpaces ? Number(parkingSpaces) : undefined,
      // Garden
      hasGarden: hasGarden === true || hasGarden === 'true',
      gardenSize: gardenSize ? Number(gardenSize) : undefined,
      gardenType,
      // Annex
      hasAnnex: hasAnnex === true || hasAnnex === 'true',
      annexType,
      annexSize: annexSize ? Number(annexSize) : undefined,
      annexBedrooms: annexBedrooms ? Number(annexBedrooms) : undefined,
      annexBathrooms: annexBathrooms ? Number(annexBathrooms) : undefined,
      // Gate
      hasGate: hasGate === true || hasGate === 'true',
      gateType,
      gateMaterial,
      // Fence
      hasFence: hasFence === true || hasFence === 'true',
      fenceType,
      fenceHeight: fenceHeight ? Number(fenceHeight) : undefined,
      // Neighborhood
      nearestSchoolKm: nearestSchoolKm ? Number(nearestSchoolKm) : undefined,
      nearestHospitalKm: nearestHospitalKm ? Number(nearestHospitalKm) : undefined,
      nearestTransportKm: nearestTransportKm ? Number(nearestTransportKm) : undefined,
      nearestMarketKm: nearestMarketKm ? Number(nearestMarketKm) : undefined,
      roadAccessType,
      // Valuation
      valuationAmount: valuationAmount ? Number(valuationAmount) : undefined,
      notes
    });

    res.json({
      success: true,
      message: 'Field data updated successfully. Property is back under review.',
      data: fieldData
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }

    console.error('Update field data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update field data'
    });
  }
};

// ============================================
// GET SUBMISSION HISTORY
// ============================================

export const getSubmissionHistory = async (req: AuthRequest, res: Response) => {
  try {
    const collectorId = req.authenticatedUser?.id;

    if (!collectorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const submissions = await collectorService.getSubmissionHistory(collectorId);

    res.json({
      success: true,
      data: submissions
    });
  } catch (error) {
    console.error('Get submission history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch submission history'
    });
  }
};

// ============================================
// GET REVISION REQUESTS
// ============================================

export const getRevisionRequests = async (req: AuthRequest, res: Response) => {
  try {
    const collectorId = req.authenticatedUser?.id;
    const { page, limit } = req.query;

    if (!collectorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const result = await collectorService.getRevisionRequests(collectorId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10
    });

    res.json({
      success: true,
      data: {
        properties: result.properties,
        pagination: result.pagination
      }
    });
  } catch (error) {
    console.error('Get revision requests error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revision requests'
    });
  }
};