import prisma from '../config/prisma';

// Since you don't have @prisma/client, we'll define the FieldData type manually
export interface FieldData {
  id: string;
  latitude: number | null;
  longitude: number | null;
  gpsCapturedAt: Date | null;
  gpsAccuracy: number | null;
  propertyType: string | null;
  condition: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  landSize: number | null;
  buildingSize: number | null;
  yearBuilt: number | null;
  parkingSpaces: number | null;
  hasGarden: boolean | null;
  gardenSize: number | null;
  gardenType: string | null;
  hasAnnex: boolean | null;
  annexType: string | null;
  annexSize: number | null;
  annexBedrooms: number | null;
  annexBathrooms: number | null;
  hasGate: boolean | null;
  gateType: string | null;
  gateMaterial: string | null;
  hasFence: boolean | null;
  fenceType: string | null;
  fenceHeight: number | null;
  hasElectricity: boolean | null;
  hasWaterSupply: boolean | null;
  hasWaterTank: boolean | null;
  floodRisk: boolean | null;
  landSlope: string | null;
  floorMaterial: string | null;
  roofType: string | null;
  propertyCategory: string | null;
  nearestSchoolKm: number | null;
  nearestHospitalKm: number | null;
  nearestTransportKm: number | null;
  nearestMarketKm: number | null;
  roadAccessType: string | null;
  valuationAmount: number | null;
  valuationConfidence: number | null;
  valuationMethod: string | null;
  notes: string | null;
  submittedAt: Date;
  updatedAt: Date;
  propertyId: string;
  
  // New premium features
  hasSwimmingPool?: boolean | null;
  hasGym?: boolean | null;
  hasSmartHome?: boolean | null;
  hasSolarPanels?: boolean | null;
  hasBackupGenerator?: boolean | null;
  hasSecuritySystem?: boolean | null;
  hasLandscapedGarden?: boolean | null;
  hasModernKitchen?: boolean | null;
  hasAirConditioning?: boolean | null;
  hasFireplace?: boolean | null;
  hasBalcony?: boolean | null;
  hasGarage?: boolean | null;
  hasStaffQuarters?: boolean | null;
  hasStorageRoom?: boolean | null;
  hasWaterHeater?: boolean | null;
  hasIntercom?: boolean | null;
  viewType?: string | null;
}

// Extended type that includes property relation
export interface FieldDataWithProperty extends FieldData {
  property?: {
    district: string;
    sector?: string;
    cell?: string;
    province?: string;
  };
}

/**
 * FINAL ML FEATURE VECTOR OUTPUT
 * Everything becomes numbers for training
 */
export interface PropertyFeatures {
  // Core size features
  landSize: number;
  buildingSize: number;
  yearBuilt: number;
  propertyAge: number;

  // Structural features
  bedrooms: number;
  bathrooms: number;
  parkingSpaces: number;

  // Binary utilities (0/1)
  hasElectricity: number;
  hasWaterSupply: number;
  hasWaterTank: number;
  floodRisk: number;

  // Encoded categorical features
  propertyType: number;
  propertyCategory: number;
  landSlope: number;
  floorMaterial: number;
  roofType: number;
  roadAccessType: number;

  // Distance features
  nearestSchoolKm: number;
  nearestHospitalKm: number;
  nearestTransportKm: number;
  nearestMarketKm: number;

  // Derived engineered features
  totalRooms: number;
  roomDensity: number;
  amenitiesScore: number;

  // Location encoding (IMPORTANT)
  districtEncoded: number;
}

/**
 * Simple encoding maps (we will improve later with embeddings)
 */
const ENCODINGS = {
  propertyType: {
    BASIC: 0,
    STANDARD: 1,
    LUXURY: 2,
  } as Record<string, number>,

  propertyCategory: {
    RESIDENTIAL: 0,
    COMMERCIAL: 1,
    LAND: 2,
    AGRICULTURAL: 3,
  } as Record<string, number>,

  landSlope: {
    Flat: 0,
    Gentle: 1,
    Steep: 2,
    Hilly: 3,
  } as Record<string, number>,

  floorMaterial: {
    Cement: 0,
    Wood: 1,
    Tiles: 2,
    Marble: 3,
  } as Record<string, number>,

  roofType: {
    Concrete: 0,
    Tiles: 1,
    'Iron sheets': 2,
    Thatched: 3,
  } as Record<string, number>,

  roadAccessType: {
    PAVED: 3,
    UNPAVED: 2,
    UNDER_CONSTRUCTION: 1,
    DIRT: 0,
  } as Record<string, number>,

  district: {
    'Gasabo': 10,
    'Kicukiro': 9,
    'Nyarugenge': 10,
    'Rubavu': 8,
    'Musanze': 7,
    'Huye': 6,
    'Rusizi': 6,
    'Nyagatare': 5,
    'Rwamagana': 5,
    'Muhanga': 5,
    'Bugesera': 4,
    'Kayonza': 4,
    'Gatsibo': 3,
    'default': 5,
  } as Record<string, number>,

  viewType: {
    'None': 0,
    'Valley': 1,
    'City': 2,
    'Mountain': 3,
    'Lake': 4,
  } as Record<string, number>,

  condition: {
    'NEEDS_RENOVATION': 0,
    'FAIR': 1,
    'GOOD': 2,
    'EXCELLENT': 3,
  } as Record<string, number>,
};

/**
 * Helper function to safely encode values
 */
function safeEncode(value: string | null | undefined, encodingMap: Record<string, number>, defaultValue: string = 'default'): number {
  if (!value) return encodingMap[defaultValue] ?? 0;
  return encodingMap[value] ?? encodingMap[defaultValue] ?? 0;
}

/**
 * FEATURE BUILDER FUNCTION - Original version for FieldData without relation
 */
export function buildFeatures(data: FieldData, district?: string | null): PropertyFeatures {
  const currentYear = new Date().getFullYear();
  const propertyAge = currentYear - (data.yearBuilt ?? currentYear);

  const totalRooms = (data.bedrooms ?? 0) + (data.bathrooms ?? 0);
  const roomDensity = (data.buildingSize ?? 1) / Math.max(totalRooms, 1);

  // Enhanced amenities scoring with premium features
  let amenitiesScore = 0;
  if (data.hasElectricity) amenitiesScore += 1;
  if (data.hasWaterSupply) amenitiesScore += 1;
  if (data.hasWaterTank) amenitiesScore += 0.5;
  if (data.hasGarden) amenitiesScore += 1;
  if (data.hasFence) amenitiesScore += 1;
  if (data.hasGate) amenitiesScore += 1;
  if (data.parkingSpaces && data.parkingSpaces > 0) amenitiesScore += 1;
  if (data.floodRisk) amenitiesScore -= 1;
  
  // Premium features boost
  if (data.hasSwimmingPool) amenitiesScore += 2;
  if (data.hasGym) amenitiesScore += 1.5;
  if (data.hasSmartHome) amenitiesScore += 1.5;
  if (data.hasSolarPanels) amenitiesScore += 1;
  if (data.hasBackupGenerator) amenitiesScore += 1;
  if (data.hasSecuritySystem) amenitiesScore += 1;
  if (data.hasLandscapedGarden) amenitiesScore += 1;
  if (data.hasModernKitchen) amenitiesScore += 1;
  if (data.hasAirConditioning) amenitiesScore += 0.5;
  if (data.hasFireplace) amenitiesScore += 0.5;
  if (data.hasBalcony) amenitiesScore += 0.5;
  if (data.hasGarage) amenitiesScore += 1;
  if (data.hasStaffQuarters) amenitiesScore += 1.5;
  if (data.hasStorageRoom) amenitiesScore += 0.5;
  if (data.hasWaterHeater) amenitiesScore += 0.5;
  if (data.hasIntercom) amenitiesScore += 0.5;

  // Condition bonus
  if (data.condition === 'EXCELLENT') amenitiesScore += 2;
  if (data.condition === 'GOOD') amenitiesScore += 1;
  if (data.condition === 'FAIR') amenitiesScore -= 0.5;
  if (data.condition === 'NEEDS_RENOVATION') amenitiesScore -= 2;

  // View premium bonus
  if (data.viewType === 'Lake') amenitiesScore += 2;
  if (data.viewType === 'Mountain') amenitiesScore += 1.5;
  if (data.viewType === 'City') amenitiesScore += 1;
  if (data.viewType === 'Valley') amenitiesScore += 0.5;

  return {
    // core
    landSize: data.landSize ?? 0,
    buildingSize: data.buildingSize ?? 0,
    yearBuilt: data.yearBuilt ?? currentYear,
    propertyAge: Math.max(0, propertyAge),

    // structure
    bedrooms: data.bedrooms ?? 0,
    bathrooms: data.bathrooms ?? 0,
    parkingSpaces: data.parkingSpaces ?? 0,

    // binary
    hasElectricity: data.hasElectricity ? 1 : 0,
    hasWaterSupply: data.hasWaterSupply ? 1 : 0,
    hasWaterTank: data.hasWaterTank ? 1 : 0,
    floodRisk: data.floodRisk ? 1 : 0,

    // categorical encoding
    propertyType: safeEncode(data.propertyType, ENCODINGS.propertyType, 'STANDARD'),
    propertyCategory: safeEncode(data.propertyCategory, ENCODINGS.propertyCategory, 'RESIDENTIAL'),
    landSlope: safeEncode(data.landSlope, ENCODINGS.landSlope, 'Flat'),
    floorMaterial: safeEncode(data.floorMaterial, ENCODINGS.floorMaterial, 'Cement'),
    roofType: safeEncode(data.roofType, ENCODINGS.roofType, 'Concrete'),
    roadAccessType: safeEncode(data.roadAccessType, ENCODINGS.roadAccessType, 'UNPAVED'),

    // distances
    nearestSchoolKm: data.nearestSchoolKm ?? 0,
    nearestHospitalKm: data.nearestHospitalKm ?? 0,
    nearestTransportKm: data.nearestTransportKm ?? 0,
    nearestMarketKm: data.nearestMarketKm ?? 0,

    // engineered
    totalRooms,
    roomDensity,
    amenitiesScore: Math.min(Math.max(amenitiesScore, -5), 15), // Clamp between -5 and 15

    // location - use passed district or try to get from data
    districtEncoded: safeEncode(district, ENCODINGS.district, 'default'),
  };
}

/**
 * FEATURE BUILDER FUNCTION - For data with property relation
 */
export function buildFeaturesWithProperty(data: FieldDataWithProperty): PropertyFeatures {
  const district = data.property?.district;
  return buildFeatures(data, district);
}

/**
 * Calculate premium features count for ML feature vector
 */
export function getPremiumFeaturesCount(data: FieldData): number {
  let count = 0;
  if (data.hasSwimmingPool) count++;
  if (data.hasGym) count++;
  if (data.hasSmartHome) count++;
  if (data.hasSolarPanels) count++;
  if (data.hasBackupGenerator) count++;
  if (data.hasSecuritySystem) count++;
  if (data.hasLandscapedGarden) count++;
  if (data.hasModernKitchen) count++;
  if (data.hasAirConditioning) count++;
  if (data.hasFireplace) count++;
  if (data.hasBalcony) count++;
  if (data.hasGarage) count++;
  if (data.hasStaffQuarters) count++;
  if (data.hasStorageRoom) count++;
  if (data.hasWaterHeater) count++;
  if (data.hasIntercom) count++;
  return count;
}

/**
 * Calculate total premium features value for training
 */
export function getPremiumFeaturesValue(data: FieldData): number {
  let value = 0;
  if (data.hasSwimmingPool) value += 3000000;
  if (data.hasGym) value += 1500000;
  if (data.hasSmartHome) value += 1000000;
  if (data.hasSolarPanels) value += 2000000;
  if (data.hasBackupGenerator) value += 800000;
  if (data.hasSecuritySystem) value += 500000;
  if (data.hasLandscapedGarden) value += 400000;
  if (data.hasModernKitchen) value += 600000;
  if (data.hasAirConditioning) value += 300000;
  if (data.hasFireplace) value += 250000;
  if (data.hasBalcony) value += 300000;
  if (data.hasGarage) value += 700000;
  if (data.hasStaffQuarters) value += 1000000;
  if (data.hasStorageRoom) value += 200000;
  if (data.hasWaterHeater) value += 150000;
  if (data.hasIntercom) value += 80000;
  return value;
}

// Export prisma for use in other files
export { prisma };