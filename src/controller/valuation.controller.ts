import { Request, Response } from 'express';
import { calculateValuation } from '../services/valuation.service';
import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';

export const getValuation = async (req: Request, res: Response) => {
  try {
    const valuationInput = req.body;
    
    // Validate required fields
    const requiredFields = ['landSize', 'buildingSize', 'propertyType', 'district'];
    for (const field of requiredFields) {
      if (!valuationInput[field]) {
        throw new AppError(`Missing required field: ${field}`, 400);
      }
    }
    
    const valuation = await calculateValuation(valuationInput);
    
    res.json({
      success: true,
      data: valuation,
      meta: {
        model: valuation.modelUsed,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Valuation error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Valuation failed'
    });
  }
};

export const getPropertyValuation = async (req: Request, res: Response) => {
  try {
    let propertyId = req.params.propertyId;
    if (Array.isArray(propertyId)) {
      propertyId = propertyId[0];
    }
    
    if (!propertyId) {
      throw new AppError('Property ID is required', 400);
    }
    
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { 
        fieldData: true
      }
    });
    
    if (!property) {
      throw new AppError('Property not found', 404);
    }
    
    if (!property.fieldData) {
      throw new AppError('Property has no field data', 400);
    }
    
    const valuationInput = {
      landSize: property.fieldData.landSize ?? 0,
      buildingSize: property.fieldData.buildingSize ?? 0,
      yearBuilt: property.fieldData.yearBuilt ?? new Date().getFullYear(),
      propertyType: (property.fieldData.propertyType as any) ?? 'STANDARD',
      propertyCategory: (property.fieldData.propertyCategory as any) ?? 'RESIDENTIAL',
      bedrooms: property.fieldData.bedrooms ?? 0,
      bathrooms: property.fieldData.bathrooms ?? 0,
      gardenSize: property.fieldData.gardenSize ?? 0,
      fenceHeight: property.fieldData.fenceHeight ?? 0,
      gateType: (property.fieldData.gateType as any) ?? null,
      parkingSpaces: property.fieldData.parkingSpaces ?? 0,
      hasElectricity: property.fieldData.hasElectricity ?? true,
      hasWaterSupply: property.fieldData.hasWaterSupply ?? true,
      hasWaterTank: property.fieldData.hasWaterTank ?? false,
      floodRisk: property.fieldData.floodRisk ?? false,
      landSlope: (property.fieldData.landSlope as any) ?? 'Flat',
      floorMaterial: (property.fieldData.floorMaterial as any) ?? 'Cement',
      roofType: (property.fieldData.roofType as any) ?? 'Concrete',
      district: property.district,
      nearestSchoolKm: property.fieldData.nearestSchoolKm ?? 0,
      nearestHospitalKm: property.fieldData.nearestHospitalKm ?? 0,
      nearestTransportKm: property.fieldData.nearestTransportKm ?? 0,
      nearestMarketKm: property.fieldData.nearestMarketKm ?? 0,
      roadAccessType: (property.fieldData.roadAccessType as any) ?? 'UNPAVED',
      hasSwimmingPool: property.fieldData.hasSwimmingPool ?? false,
      hasGym: property.fieldData.hasGym ?? false,
      hasSmartHome: property.fieldData.hasSmartHome ?? false,
      hasSolarPanels: property.fieldData.hasSolarPanels ?? false,
      hasBackupGenerator: property.fieldData.hasBackupGenerator ?? false,
      hasSecuritySystem: property.fieldData.hasSecuritySystem ?? false,
      hasLandscapedGarden: property.fieldData.hasLandscapedGarden ?? false,
      hasModernKitchen: property.fieldData.hasModernKitchen ?? false,
      hasAirConditioning: property.fieldData.hasAirConditioning ?? false,
      hasFireplace: property.fieldData.hasFireplace ?? false,
      hasBalcony: property.fieldData.hasBalcony ?? false,
      hasGarage: property.fieldData.hasGarage ?? false,
      hasStaffQuarters: property.fieldData.hasStaffQuarters ?? false,
      hasStorageRoom: property.fieldData.hasStorageRoom ?? false,
      hasWaterHeater: property.fieldData.hasWaterHeater ?? false,
      hasIntercom: property.fieldData.hasIntercom ?? false,
      viewType: (property.fieldData.viewType as any) ?? 'None',
      condition: (property.fieldData.condition as any) ?? 'GOOD'
    };
    
    const valuation = await calculateValuation(valuationInput);
    
    res.json({
      success: true,
      data: valuation,
      property: {
        id: property.id,
        upiNumber: property.upiNumber,
        district: property.district
      }
    });
  } catch (error) {
    console.error('Get property valuation error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get valuation'
    });
  }
};

export const saveValuation = async (req: Request, res: Response) => {
  try {
    let propertyId = req.params.propertyId;
    if (Array.isArray(propertyId)) {
      propertyId = propertyId[0];
    }
    
    if (!propertyId) {
      throw new AppError('Property ID is required', 400);
    }
    
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { 
        fieldData: true
      }
    });
    
    if (!property) {
      throw new AppError('Property not found', 404);
    }
    
    if (!property.fieldData) {
      throw new AppError('Property has no field data', 400);
    }
    
    const { overrideExisting = false } = req.body;
    if (property.aiValuation && !overrideExisting) {
      throw new AppError('Property already has a valuation. Use overrideExisting=true to override', 400);
    }
    
    const valuationInput = {
      landSize: property.fieldData.landSize ?? 0,
      buildingSize: property.fieldData.buildingSize ?? 0,
      yearBuilt: property.fieldData.yearBuilt ?? new Date().getFullYear(),
      propertyType: (property.fieldData.propertyType as any) ?? 'STANDARD',
      propertyCategory: (property.fieldData.propertyCategory as any) ?? 'RESIDENTIAL',
      bedrooms: property.fieldData.bedrooms ?? 0,
      bathrooms: property.fieldData.bathrooms ?? 0,
      gardenSize: property.fieldData.gardenSize ?? 0,
      fenceHeight: property.fieldData.fenceHeight ?? 0,
      gateType: (property.fieldData.gateType as any) ?? null,
      parkingSpaces: property.fieldData.parkingSpaces ?? 0,
      hasElectricity: property.fieldData.hasElectricity ?? true,
      hasWaterSupply: property.fieldData.hasWaterSupply ?? true,
      hasWaterTank: property.fieldData.hasWaterTank ?? false,
      floodRisk: property.fieldData.floodRisk ?? false,
      landSlope: (property.fieldData.landSlope as any) ?? 'Flat',
      floorMaterial: (property.fieldData.floorMaterial as any) ?? 'Cement',
      roofType: (property.fieldData.roofType as any) ?? 'Concrete',
      district: property.district,
      nearestSchoolKm: property.fieldData.nearestSchoolKm ?? 0,
      nearestHospitalKm: property.fieldData.nearestHospitalKm ?? 0,
      nearestTransportKm: property.fieldData.nearestTransportKm ?? 0,
      nearestMarketKm: property.fieldData.nearestMarketKm ?? 0,
      roadAccessType: (property.fieldData.roadAccessType as any) ?? 'UNPAVED',
      hasSwimmingPool: property.fieldData.hasSwimmingPool ?? false,
      hasGym: property.fieldData.hasGym ?? false,
      hasSmartHome: property.fieldData.hasSmartHome ?? false,
      hasSolarPanels: property.fieldData.hasSolarPanels ?? false,
      hasBackupGenerator: property.fieldData.hasBackupGenerator ?? false,
      hasSecuritySystem: property.fieldData.hasSecuritySystem ?? false,
      hasLandscapedGarden: property.fieldData.hasLandscapedGarden ?? false,
      hasModernKitchen: property.fieldData.hasModernKitchen ?? false,
      hasAirConditioning: property.fieldData.hasAirConditioning ?? false,
      hasFireplace: property.fieldData.hasFireplace ?? false,
      hasBalcony: property.fieldData.hasBalcony ?? false,
      hasGarage: property.fieldData.hasGarage ?? false,
      hasStaffQuarters: property.fieldData.hasStaffQuarters ?? false,
      hasStorageRoom: property.fieldData.hasStorageRoom ?? false,
      hasWaterHeater: property.fieldData.hasWaterHeater ?? false,
      hasIntercom: property.fieldData.hasIntercom ?? false,
      viewType: (property.fieldData.viewType as any) ?? 'None',
      condition: (property.fieldData.condition as any) ?? 'GOOD'
    };
    
    const valuation = await calculateValuation(valuationInput);
    
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        aiValuation: valuation.estimatedValue,
        aiConfidence: valuation.confidenceScore,
        aiFactors: valuation.features as any,
        updatedAt: new Date()
      }
    });
    
    // Get userId from request user (using type assertion)
    const userReq = req as any;
    const userId = userReq.user?.userId || userReq.user?.id || 'system';
    
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'VALUATION_SAVED',
        entityType: 'Property',
        entityId: propertyId,
        oldStatus: property.aiValuation?.toString(),
        newStatus: valuation.estimatedValue.toString(),
        details: {
          modelUsed: valuation.modelUsed,
          confidenceScore: valuation.confidenceScore
        },
        ipAddress: req.ip
      }
    });
    
    res.json({
      success: true,
      message: 'Valuation saved successfully',
      data: {
        propertyId,
        estimatedValue: valuation.estimatedValue,
        confidenceScore: valuation.confidenceScore,
        modelUsed: valuation.modelUsed,
        savedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Save valuation error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save valuation'
    });
  }
};

export const compareValuations = async (req: Request, res: Response) => {
  try {
    const valuationInput = req.body;
    
    const requiredFields = ['landSize', 'buildingSize', 'propertyType', 'district'];
    for (const field of requiredFields) {
      if (!valuationInput[field]) {
        throw new AppError(`Missing required field: ${field}`, 400);
      }
    }
    
    const valuation = await calculateValuation(valuationInput);
    
    res.json({
      success: true,
      data: {
        mlValuation: {
          value: valuation.estimatedValue,
          confidence: valuation.confidenceScore,
          priceRange: valuation.priceRange,
          modelUsed: valuation.modelUsed
        },
        note: "Rule-based valuation has been replaced by ML model for better accuracy"
      }
    });
  } catch (error) {
    console.error('Compare valuations error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Comparison failed'
    });
  }
};