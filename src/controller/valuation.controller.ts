import { Request, Response } from 'express';
import * as valuationService from '../services/valuation.service';
import { AppError } from '../utils/AppError';
import prisma from '../config/prisma';
import { RATES } from '../services/valuation.service';

interface AuthRequest extends Request {
  authenticatedUser?: {
    id: string;
    email: string;
    role: string;
  };
}

// Helper: safely extract a single string from req.params
const paramStr = (val: string | string[]): string =>
  Array.isArray(val) ? val[0] : val;

// ============================================
// LIVE VALUATION — real-time, no save
// ============================================

export const liveValuation = async (req: Request, res: Response) => {
  try {
    const {
      // Core dimensions
      landSize,
      buildingSize,
      yearBuilt,
      propertyType,
      propertyCategory,
      // Rooms
      bedrooms,
      bathrooms,
      // Amenities
      gardenSize,
      fenceHeight,
      gateType,
      parkingSpaces,
      // Utilities
      hasElectricity,
      hasWaterSupply,
      hasWaterTank,
      // Land characteristics
      floodRisk,
      landSlope,
      // Building finishes
      floorMaterial,
      roofType,
      // Location
      district,
      // Neighbourhood distances
      nearestSchoolKm,
      nearestHospitalKm,
      nearestTransportKm,
      nearestMarketKm,
      // Road
      roadAccessType
    } = req.body;

    // ── Required field validation ─────────────────────────────────────────────
    const missingFields = [];
    if (!landSize) missingFields.push('landSize');
    if (!buildingSize && propertyCategory !== 'LAND') missingFields.push('buildingSize');
    if (!yearBuilt && propertyCategory !== 'LAND') missingFields.push('yearBuilt');
    if (!propertyType && propertyCategory !== 'LAND') missingFields.push('propertyType');
    if (!propertyCategory) missingFields.push('propertyCategory');
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    if (Number(landSize) <= 0) {
      return res.status(400).json({
        success: false,
        error: 'landSize must be greater than 0'
      });
    }

    // ── Enum validation ───────────────────────────────────────────────────────
    const validPropertyTypes = ['BASIC', 'STANDARD', 'LUXURY'];
    const normalizedPropertyType = String(propertyType || 'BASIC').toUpperCase();
    if (!validPropertyTypes.includes(normalizedPropertyType)) {
      return res.status(400).json({
        success: false,
        error: `propertyType must be one of: ${validPropertyTypes.join(', ')}`
      });
    }

    const validPropertyCategories = ['RESIDENTIAL', 'COMMERCIAL', 'LAND', 'AGRICULTURAL'];
    const normalizedPropertyCategory = String(propertyCategory).toUpperCase();
    if (!validPropertyCategories.includes(normalizedPropertyCategory)) {
      return res.status(400).json({
        success: false,
        error: `propertyCategory must be one of: ${validPropertyCategories.join(', ')}`
      });
    }

    const validRoadTypes = ['PAVED', 'UNPAVED', 'DIRT', 'UNDER_CONSTRUCTION'];
    const normalizedRoadType = String(roadAccessType || 'UNPAVED').toUpperCase();
    if (!validRoadTypes.includes(normalizedRoadType)) {
      return res.status(400).json({
        success: false,
        error: `roadAccessType must be one of: ${validRoadTypes.join(', ')}`
      });
    }

    const validGateTypes = ['AUTOMATIC', 'SLIDING', 'SWING', 'MANUAL'];
    let normalizedGateType: string | null = gateType
      ? String(gateType).toUpperCase()
      : null;
    if (normalizedGateType === 'NONE') normalizedGateType = null;
    if (normalizedGateType && !validGateTypes.includes(normalizedGateType)) {
      return res.status(400).json({
        success: false,
        error: `gateType must be one of: ${validGateTypes.join(', ')} or null`
      });
    }

    const validLandSlopes = ['Flat', 'Gentle', 'Steep', 'Hilly'];
    const normalizedLandSlope = landSlope || 'Flat';
    if (!validLandSlopes.includes(normalizedLandSlope)) {
      return res.status(400).json({
        success: false,
        error: `landSlope must be one of: ${validLandSlopes.join(', ')}`
      });
    }

    const validFloorMaterials = ['Marble', 'Tiles', 'Wood', 'Cement'];
    const normalizedFloorMaterial = floorMaterial || 'Cement';
    if (!validFloorMaterials.includes(normalizedFloorMaterial)) {
      return res.status(400).json({
        success: false,
        error: `floorMaterial must be one of: ${validFloorMaterials.join(', ')}`
      });
    }

    const validRoofTypes = ['Concrete', 'Tiles', 'Iron sheets', 'Thatched'];
    const normalizedRoofType = roofType || 'Concrete';
    if (!validRoofTypes.includes(normalizedRoofType)) {
      return res.status(400).json({
        success: false,
        error: `roofType must be one of: ${validRoofTypes.join(', ')}`
      });
    }

    // ── Calculate valuation ────────────────────────────────────────────────────
    const valuation = valuationService.calculateLiveValuation({
      landSize:           Number(landSize),
      buildingSize:       Number(buildingSize) || 0,
      yearBuilt:          Number(yearBuilt) || 2000,
      propertyType:       normalizedPropertyType as any,
      propertyCategory:   normalizedPropertyCategory as any,
      bedrooms:           Number(bedrooms) || 2,
      bathrooms:          Number(bathrooms) || 1,
      gardenSize:         Number(gardenSize) || 0,
      fenceHeight:        Number(fenceHeight) || 0,
      gateType:           normalizedGateType as any,
      parkingSpaces:      Number(parkingSpaces) || 0,
      hasElectricity:     hasElectricity === true || hasElectricity === 'true',
      hasWaterSupply:     hasWaterSupply === true || hasWaterSupply === 'true',
      hasWaterTank:       hasWaterTank === true || hasWaterTank === 'true',
      floodRisk:          floodRisk === true || floodRisk === 'true',
      landSlope:          normalizedLandSlope as any,
      floorMaterial:      normalizedFloorMaterial as any,
      roofType:           normalizedRoofType as any,
      district:           district || 'default',
      nearestSchoolKm:    Number(nearestSchoolKm) || 5,
      nearestHospitalKm:  Number(nearestHospitalKm) || 5,
      nearestTransportKm: Number(nearestTransportKm) || 5,
      nearestMarketKm:    Number(nearestMarketKm) || 5,
      roadAccessType:     normalizedRoadType as any,
    });

    return res.status(200).json({ success: true, data: valuation });

  } catch (error) {
    console.error('liveValuation error:', error);
    return res.status(500).json({ success: false, error: 'Failed to calculate valuation' });
  }
};

// ============================================
// SAVE VALUATION — triggered after field data submission
// ============================================

export const saveValuation = async (req: AuthRequest, res: Response) => {
  try {
    const propertyId = paramStr(req.params.propertyId);
    const userId = req.authenticatedUser?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { fieldData: true }
    });

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    if (!property.fieldData) {
      return res.status(404).json({
        success: false,
        error: 'Field data not found — data collector must submit field data first'
      });
    }

    const fd = property.fieldData;

    const valuation = valuationService.calculateLiveValuation({
      landSize:           fd.landSize ?? 0,
      buildingSize:       fd.buildingSize ?? 0,
      yearBuilt:          fd.yearBuilt ?? 2000,
      propertyType:       (fd.propertyType as any) ?? 'STANDARD',
      propertyCategory:   (fd.propertyCategory as any) ?? 'RESIDENTIAL',
      bedrooms:           fd.bedrooms ?? 2,
      bathrooms:          fd.bathrooms ?? 1,
      gardenSize:         fd.gardenSize ?? 0,
      fenceHeight:        fd.fenceHeight ?? 0,
      gateType:           (fd.gateType as any) ?? null,
      parkingSpaces:      fd.parkingSpaces ?? 0,
      hasElectricity:     fd.hasElectricity ?? true,
      hasWaterSupply:     fd.hasWaterSupply ?? true,
      hasWaterTank:       fd.hasWaterTank ?? false,
      floodRisk:          fd.floodRisk ?? false,
      landSlope:          (fd.landSlope as any) ?? 'Flat',
      floorMaterial:      (fd.floorMaterial as any) ?? 'Cement',
      roofType:           (fd.roofType as any) ?? 'Concrete',
      district:           property.district,
      nearestSchoolKm:    fd.nearestSchoolKm ?? 5,
      nearestHospitalKm:  fd.nearestHospitalKm ?? 5,
      nearestTransportKm: fd.nearestTransportKm ?? 5,
      nearestMarketKm:    fd.nearestMarketKm ?? 5,
      roadAccessType:     (fd.roadAccessType as any) ?? 'UNPAVED',
    });

    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: {
        aiValuation:  valuation.estimatedValue,
        aiConfidence: valuation.confidenceScore,
        aiFactors:    valuation.breakdown as any,
        status:       'UNDER_REVIEW'
      }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action:     'VALUATION_COMPUTED',
        entityType: 'Property',
        entityId:   propertyId,
        newStatus:  'UNDER_REVIEW',
        details: {
          estimatedValue: valuation.estimatedValue,
          confidenceScore: valuation.confidenceScore
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Valuation computed and saved successfully',
      data: { property: updatedProperty, valuation }
    });

  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('saveValuation error:', error);
    return res.status(500).json({ success: false, error: 'Failed to save valuation' });
  }
};

// ============================================
// GET VALUATION — fetch and recompute for a property
// ============================================

export const getValuation = async (req: Request, res: Response) => {
  try {
    const propertyId = paramStr(req.params.propertyId);

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { fieldData: true }
    });

    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }

    if (!property.fieldData) {
      return res.status(404).json({
        success: false,
        error: 'No field data available — valuation cannot be computed yet'
      });
    }

    const fd = property.fieldData;

    const valuation = valuationService.calculateLiveValuation({
      landSize:           fd.landSize ?? 0,
      buildingSize:       fd.buildingSize ?? 0,
      yearBuilt:          fd.yearBuilt ?? 2000,
      propertyType:       (fd.propertyType as any) ?? 'STANDARD',
      propertyCategory:   (fd.propertyCategory as any) ?? 'RESIDENTIAL',
      bedrooms:           fd.bedrooms ?? 2,
      bathrooms:          fd.bathrooms ?? 1,
      gardenSize:         fd.gardenSize ?? 0,
      fenceHeight:        fd.fenceHeight ?? 0,
      gateType:           (fd.gateType as any) ?? null,
      parkingSpaces:      fd.parkingSpaces ?? 0,
      hasElectricity:     fd.hasElectricity ?? true,
      hasWaterSupply:     fd.hasWaterSupply ?? true,
      hasWaterTank:       fd.hasWaterTank ?? false,
      floodRisk:          fd.floodRisk ?? false,
      landSlope:          (fd.landSlope as any) ?? 'Flat',
      floorMaterial:      (fd.floorMaterial as any) ?? 'Cement',
      roofType:           (fd.roofType as any) ?? 'Concrete',
      district:           property.district,
      nearestSchoolKm:    fd.nearestSchoolKm ?? 5,
      nearestHospitalKm:  fd.nearestHospitalKm ?? 5,
      nearestTransportKm: fd.nearestTransportKm ?? 5,
      nearestMarketKm:    fd.nearestMarketKm ?? 5,
      roadAccessType:     (fd.roadAccessType as any) ?? 'UNPAVED',
    });

    return res.status(200).json({
      success: true,
      data: {
        property: {
          id:           property.id,
          upiNumber:    property.upiNumber,
          ownerName:    property.ownerName,
          district:     property.district,
          status:       property.status,
          aiValuation:  property.aiValuation,
          aiConfidence: property.aiConfidence,
        },
        valuation
      }
    });

  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('getValuation error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get valuation' });
  }
};

// ============================================
// PREVIEW VALUATION — quick estimate, no field data needed
// ============================================

export const previewValuation = async (req: Request, res: Response) => {
  try {
    const { landSize, buildingSize, district } = req.body;

    if (!landSize || !buildingSize) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: landSize, buildingSize'
      });
    }

    const landRate = RATES.land[district as keyof typeof RATES.land] ?? RATES.land.default;
    const buildingRate = RATES.building['STANDARD'];

    const landValue = Number(landSize) * landRate;
    const buildingValue = Number(buildingSize) * buildingRate;
    const estimatedValue = Math.round((landValue + buildingValue) / 100000) * 100000;

    return res.status(200).json({
      success: true,
      data: {
        estimatedValue,
        landValue: Math.round(landValue),
        buildingValue: Math.round(buildingValue),
        landRate,
        buildingRate,
        note: 'This is a basic preview. Full valuation requires complete field data.'
      }
    });

  } catch (error) {
    console.error('previewValuation error:', error);
    return res.status(500).json({ success: false, error: 'Failed to calculate preview' });
  }
};