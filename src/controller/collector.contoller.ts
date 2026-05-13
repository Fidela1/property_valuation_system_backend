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
      propertyType,
      condition,
      bedrooms,
      bathrooms,
      landSize,
      buildingSize,
      yearBuilt,
      parkingSpaces,
      hasGarden,
      gardenSize,
      gardenType,
      hasAnnex,
      annexType,
      annexSize,
      annexBedrooms,
      annexBathrooms,
      hasGate,
      gateType,
      gateMaterial,
      hasFence,
      fenceType,
      fenceHeight,
      nearestSchoolKm,
      nearestHospitalKm,
      nearestTransportKm,
      nearestMarketKm,
      roadAccessType,
      valuationAmount,
      notes,
      images
    } = req.body;

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
      propertyType,
      condition,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      landSize: landSize ? Number(landSize) : undefined,
      buildingSize: buildingSize ? Number(buildingSize) : undefined,
      yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
      parkingSpaces: parkingSpaces ? Number(parkingSpaces) : undefined,
      hasGarden: hasGarden === true || hasGarden === 'true',
      gardenSize: gardenSize ? Number(gardenSize) : undefined,
      gardenType,
      hasAnnex: hasAnnex === true || hasAnnex === 'true',
      annexType,
      annexSize: annexSize ? Number(annexSize) : undefined,
      annexBedrooms: annexBedrooms ? Number(annexBedrooms) : undefined,
      annexBathrooms: annexBathrooms ? Number(annexBathrooms) : undefined,
      hasGate: hasGate === true || hasGate === 'true',
      gateType,
      gateMaterial,
      hasFence: hasFence === true || hasFence === 'true',
      fenceType,
      fenceHeight: fenceHeight ? Number(fenceHeight) : undefined,
      nearestSchoolKm: nearestSchoolKm ? Number(nearestSchoolKm) : undefined,
      nearestHospitalKm: nearestHospitalKm ? Number(nearestHospitalKm) : undefined,
      nearestTransportKm: nearestTransportKm ? Number(nearestTransportKm) : undefined,
      nearestMarketKm: nearestMarketKm ? Number(nearestMarketKm) : undefined,
      roadAccessType,
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

export const updateFieldData = async (req: AuthRequest, res: Response) => {
  try {
    const collectorId = req.authenticatedUser?.id;
      let { id } = req.params;
    
    const {
 
      latitude,
      longitude,
      gpsAccuracy,
      propertyType,
      condition,
      bedrooms,
      bathrooms,
      landSize,
      buildingSize,
      yearBuilt,
      parkingSpaces,
      hasGarden,
      gardenSize,
      gardenType,
      hasAnnex,
      annexType,
      annexSize,
      annexBedrooms,
      annexBathrooms,
      hasGate,
      gateType,
      gateMaterial,
      hasFence,
      fenceType,
      fenceHeight,
      nearestSchoolKm,
      nearestHospitalKm,
      nearestTransportKm,
      nearestMarketKm,
      roadAccessType,
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
      latitude,
      longitude,
      gpsAccuracy: gpsAccuracy ? Number(gpsAccuracy) : undefined,
      propertyType,
      condition,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      landSize: landSize ? Number(landSize) : undefined,
      buildingSize: buildingSize ? Number(buildingSize) : undefined,
      yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
      parkingSpaces: parkingSpaces ? Number(parkingSpaces) : undefined,
      hasGarden: hasGarden === true || hasGarden === 'true',
      gardenSize: gardenSize ? Number(gardenSize) : undefined,
      gardenType,
      hasAnnex: hasAnnex === true || hasAnnex === 'true',
      annexType,
      annexSize: annexSize ? Number(annexSize) : undefined,
      annexBedrooms: annexBedrooms ? Number(annexBedrooms) : undefined,
      annexBathrooms: annexBathrooms ? Number(annexBathrooms) : undefined,
      hasGate: hasGate === true || hasGate === 'true',
      gateType,
      gateMaterial,
      hasFence: hasFence === true || hasFence === 'true',
      fenceType,
      fenceHeight: fenceHeight ? Number(fenceHeight) : undefined,
      nearestSchoolKm: nearestSchoolKm ? Number(nearestSchoolKm) : undefined,
      nearestHospitalKm: nearestHospitalKm ? Number(nearestHospitalKm) : undefined,
      nearestTransportKm: nearestTransportKm ? Number(nearestTransportKm) : undefined,
      nearestMarketKm: nearestMarketKm ? Number(nearestMarketKm) : undefined,
      roadAccessType,
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