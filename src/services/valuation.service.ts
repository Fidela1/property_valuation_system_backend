import { featureBuilderService } from './featureBuilder.service';

export interface ValuationInput {
  landSize: number;
  buildingSize: number;
  yearBuilt: number;
  propertyType: 'BASIC' | 'STANDARD' | 'LUXURY';
  propertyCategory: 'RESIDENTIAL' | 'COMMERCIAL' | 'LAND' | 'AGRICULTURAL';
  bedrooms: number;
  bathrooms: number;
  gardenSize: number;
  fenceHeight: number;
  gateType: 'AUTOMATIC' | 'SLIDING' | 'SWING' | 'MANUAL' | null;
  parkingSpaces: number;
  hasElectricity: boolean;
  hasWaterSupply: boolean;
  hasWaterTank: boolean;
  floodRisk: boolean;
  landSlope: 'Flat' | 'Gentle' | 'Steep' | 'Hilly';
  floorMaterial: 'Marble' | 'Tiles' | 'Wood' | 'Cement';
  roofType: 'Concrete' | 'Tiles' | 'Iron sheets' | 'Thatched';
  district: string;
  nearestSchoolKm: number;
  nearestHospitalKm: number;
  nearestTransportKm: number;
  nearestMarketKm: number;
  roadAccessType: 'PAVED' | 'UNPAVED' | 'DIRT' | 'UNDER_CONSTRUCTION';
  // Premium features
  hasSwimmingPool?: boolean;
  hasGym?: boolean;
  hasSmartHome?: boolean;
  hasSolarPanels?: boolean;
  hasBackupGenerator?: boolean;
  hasSecuritySystem?: boolean;
  hasLandscapedGarden?: boolean;
  hasModernKitchen?: boolean;
  hasAirConditioning?: boolean;
  hasFireplace?: boolean;
  hasBalcony?: boolean;
  hasGarage?: boolean;
  hasStaffQuarters?: boolean;
  hasStorageRoom?: boolean;
  hasWaterHeater?: boolean;
  hasIntercom?: boolean;
  viewType?: 'None' | 'Lake' | 'Mountain' | 'City' | 'Valley';
  condition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_RENOVATION';
  // Annex properties
  hasAnnex?: boolean;
  annexType?: string;
  annexSize?: number;
  annexBedrooms?: number;
  annexBathrooms?: number;
  currentYear?: number;
}

export interface ValuationOutput {
  estimatedValue: number;
  confidenceScore: number;
  breakdown: any;
  priceRange: { min: number; max: number };
  neighbourhoodScores: any;
  caps: any;
  features?: any;
  modelUsed?: string;
}

// Updated RATES with proper values
const RATES = {
  land: {
    'Gasabo': 45000, 'Kicukiro': 40000, 'Nyarugenge': 50000,
    'Musanze': 15000, 'Rubavu': 18000, 'Huye': 12000,
    'default': 5000
  },
  building: { 
    'LUXURY': 350000, 
    'STANDARD': 180000, 
    'BASIC': 100000, 
    'default': 150000 
  },
  garden: 5000,
  fence: 15000,
  parking: 500000,
  gate: { 
    'AUTOMATIC': 1500000, 
    'SLIDING': 800000, 
    'SWING': 400000, 
    'MANUAL': 200000 
  },
  annex: {
    perBedroom: 1500000,
    perBathroom: 800000,
    perM2: 100000
  },
  extraBedroom: 2000000, 
  extraBathroom: 1000000,
  depreciationRate: 0.01, 
  maxDepreciation: 0.30,
  caps: { 
    garden: 0.15, 
    fence: 0.10, 
    gate: 0.05, 
    parking: 0.08, 
    neighborhood: 0.15 
  },
  propertyCategory: { 
    'RESIDENTIAL': 1.0, 
    'COMMERCIAL': 1.3, 
    'LAND': 0.7, 
    'AGRICULTURAL': 0.5 
  },
  utilities: { 
    electricity: 0.02, 
    waterSupply: 0.02, 
    waterTank: 0.01 
  },
  landSlope: { 
    'Flat': 0.00, 
    'Gentle': -0.02, 
    'Steep': -0.05, 
    'Hilly': -0.08 
  },
  floodRisk: -0.10,
  floorMaterial: { 
    'Marble': 150000, 
    'Tiles': 80000, 
    'Wood': 60000, 
    'Cement': 30000, 
    'Default': 20000 
  },
  roofType: { 
    'Concrete': 0.00, 
    'Tiles': 0.02, 
    'Iron sheets': -0.01, 
    'Thatched': -0.05 
  },
  premiumFeatures: {
    swimmingPool: 3000000,
    gym: 1500000,
    smartHome: 1000000,
    solarPanels: 2000000,
    backupGenerator: 800000,
    securitySystem: 500000,
    landscapedGarden: 400000,
    modernKitchen: 600000,
    airConditioning: 300000,
    fireplace: 250000,
    balcony: 300000,
    garage: 700000,
    staffQuarters: 1000000,
    storageRoom: 200000,
    waterHeater: 150000,
    intercom: 80000,
  },
  viewPremium: {
    'Lake': 0.25,
    'Mountain': 0.20,
    'City': 0.15,
    'Valley': 0.10,
    'None': 0.00
  },
  conditionMultiplier: {
    'EXCELLENT': 1.15,
    'GOOD': 1.00,
    'FAIR': 0.85,
    'NEEDS_RENOVATION': 0.70
  },
  neighborhood: {
    school: { maxBonus: 0.04, tiers: [{ maxKm: 0.5, factor: 1.0 }, { maxKm: 1.0, factor: 0.6 }, { maxKm: 2.0, factor: 0.3 }] },
    hospital: { maxBonus: 0.03, tiers: [{ maxKm: 1.0, factor: 1.0 }, { maxKm: 2.0, factor: 0.6 }, { maxKm: 4.0, factor: 0.3 }] },
    transport: { maxBonus: 0.03, tiers: [{ maxKm: 0.3, factor: 1.0 }, { maxKm: 0.5, factor: 0.6 }, { maxKm: 1.0, factor: 0.3 }] },
    market: { maxBonus: 0.02, tiers: [{ maxKm: 0.5, factor: 1.0 }, { maxKm: 1.0, factor: 0.5 }, { maxKm: 2.0, factor: 0.2 }] }
  },
  road: { 'PAVED': 0.03, 'UNPAVED': 0.00, 'DIRT': -0.02, 'UNDER_CONSTRUCTION': -0.01 }
};

const proximityBonus = (distanceKm: number, config: { maxBonus: number; tiers: { maxKm: number; factor: number }[] }): number => {
  for (const tier of config.tiers) {
    if (distanceKm <= tier.maxKm) {
      return config.maxBonus * tier.factor;
    }
  }
  return 0;
};

// Helper function to ensure numeric values
const toNumber = (value: any, defaultValue: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

export async function calculateValuation(input: ValuationInput): Promise<ValuationOutput> {
  const currentYear = input.currentYear ?? new Date().getFullYear();
  
  console.log('=== VALUATION CALCULATION START ===');
  
  // Convert all values to numbers safely
  const landSize = toNumber(input.landSize);
  const buildingSize = toNumber(input.buildingSize);
  const gardenSize = toNumber(input.gardenSize);
  const fenceHeight = toNumber(input.fenceHeight);
  const parkingSpaces = toNumber(input.parkingSpaces);
  const bedrooms = toNumber(input.bedrooms);
  const bathrooms = toNumber(input.bathrooms);
  const yearBuilt = toNumber(input.yearBuilt, currentYear);
  
  console.log(`Parsed values - Land: ${landSize}, Building: ${buildingSize}, Parking: ${parkingSpaces}`);
  
  // 1. Calculate LAND VALUE
  const landRate = RATES.land[input.district as keyof typeof RATES.land] ?? RATES.land.default;
  let landValue = landSize * landRate;
  console.log(`Land: ${landSize} m² × ${landRate} = ${landValue.toLocaleString()} RWF`);
  
  // 2. Calculate BUILDING VALUE
  let buildingValue = 0;
  let floorValue = 0;
  let depreciationAmount = 0;
  
  if (input.propertyCategory !== 'LAND' && buildingSize > 0) {
    const buildingRate = RATES.building[input.propertyType] ?? RATES.building.default;
    const rawBuildingValue = buildingSize * buildingRate;
    console.log(`Building: ${buildingSize} m² × ${buildingRate} = ${rawBuildingValue.toLocaleString()} RWF`);
    
    const age = Math.max(0, currentYear - yearBuilt);
    const depreciation = Math.min(age * RATES.depreciationRate, RATES.maxDepreciation);
    depreciationAmount = rawBuildingValue * depreciation;
    buildingValue = rawBuildingValue - depreciationAmount;
    
    const floorRate = RATES.floorMaterial[input.floorMaterial] ?? RATES.floorMaterial.Default;
    floorValue = buildingSize * floorRate;
    
    const roofAdjustment = RATES.roofType[input.roofType] ?? 0;
    buildingValue = buildingValue * (1 + roofAdjustment);
    
    console.log(`After depreciation (${Math.round(depreciation * 100)}%): ${buildingValue.toLocaleString()} RWF`);
  }
  
  // 3. ROOM PREMIUM
  let roomPremium = 0;
  if (input.propertyCategory !== 'LAND' && buildingSize > 0) {
    const extraBedrooms = Math.max(0, bedrooms - 2);
    const extraBathrooms = Math.max(0, bathrooms - 1);
    roomPremium = (extraBedrooms * RATES.extraBedroom) + (extraBathrooms * RATES.extraBathroom);
    if (roomPremium > 0) console.log(`Room premium: +${roomPremium.toLocaleString()} RWF`);
  }
  
  // 4. GARDEN VALUE
 const gardenCap = landValue * RATES.caps.garden;
const rawGardenValue = (input.gardenSize || 0) * RATES.garden;
const gardenCapped = rawGardenValue > gardenCap;
const gardenValue = gardenCapped ? gardenCap : rawGardenValue;
console.log(`Garden calculation: ${input.gardenSize || 0} m² × ${RATES.garden} = ${rawGardenValue} RWF, Capped: ${gardenCapped ? gardenCap : rawGardenValue} RWF`);
  
  // 5. FENCE VALUE
const fenceCap = landValue * RATES.caps.fence;
const rawFenceValue = (input.fenceHeight || 0) * RATES.fence;
const fenceCapped = rawFenceValue > fenceCap;
const fenceValue = fenceCapped ? fenceCap : rawFenceValue;
console.log(`Fence calculation: ${input.fenceHeight || 0}m × ${RATES.fence} = ${rawFenceValue} RWF`);
  
  // 6. GATE VALUE
  const gateCap = landValue * RATES.caps.gate;
const rawGateValue = input.gateType ? (RATES.gate[input.gateType as keyof typeof RATES.gate] || 0) : 0;
const gateCapped = rawGateValue > gateCap;
const gateValue = gateCapped ? gateCap : rawGateValue;
console.log(`Gate calculation: ${input.gateType} = ${rawGateValue} RWF`);
  
  // 7. PARKING VALUE - FIXED
  // 7. PARKING VALUE - FIXED
const parkingCap = landValue * RATES.caps.parking;
const rawParkingValue = parkingSpaces * RATES.parking;
const parkingCapped = rawParkingValue > parkingCap;
const parkingValue = parkingCapped ? parkingCap : rawParkingValue;
console.log(`DEBUG - Parking spaces: ${parkingSpaces}, Rate: ${RATES.parking}, Raw: ${rawParkingValue}, Capped: ${parkingCapped}, Final: ${parkingValue}`);
console.log(`Parking: ${parkingSpaces} spaces × ${RATES.parking.toLocaleString()} = ${rawParkingValue.toLocaleString()} RWF`);
  
  // 8. ANNEX VALUE
 let annexValue = 0;
if (input.hasAnnex) {
  const annexSize = input.annexSize || 0;
  const annexBedrooms = input.annexBedrooms || 0;
  const annexBathrooms = input.annexBathrooms || 0;
  
  const annexM2Value = annexSize * 100000;
  const annexBedroomValue = annexBedrooms * 1500000;
  const annexBathroomValue = annexBathrooms * 800000;
  annexValue = annexM2Value + annexBedroomValue + annexBathroomValue;
  console.log(`Annex calculation: Size ${annexSize}m² (${annexM2Value}) + ${annexBedrooms} beds (${annexBedroomValue}) + ${annexBathrooms} baths (${annexBathroomValue}) = ${annexValue} RWF`);
}

  
  // 9. PREMIUM FEATURES VALUE
  let premiumFeaturesValue = 0;
  if (input.hasSwimmingPool) { premiumFeaturesValue += RATES.premiumFeatures.swimmingPool; console.log('✓ Swimming Pool: +3,000,000 RWF'); }
  if (input.hasGym) { premiumFeaturesValue += RATES.premiumFeatures.gym; console.log('✓ Home Gym: +1,500,000 RWF'); }
  if (input.hasSmartHome) { premiumFeaturesValue += RATES.premiumFeatures.smartHome; console.log('✓ Smart Home: +1,000,000 RWF'); }
  if (input.hasSolarPanels) { premiumFeaturesValue += RATES.premiumFeatures.solarPanels; console.log('✓ Solar Panels: +2,000,000 RWF'); }
  if (input.hasBackupGenerator) { premiumFeaturesValue += RATES.premiumFeatures.backupGenerator; console.log('✓ Backup Generator: +800,000 RWF'); }
  if (input.hasSecuritySystem) { premiumFeaturesValue += RATES.premiumFeatures.securitySystem; console.log('✓ Security System: +500,000 RWF'); }
  if (input.hasLandscapedGarden) { premiumFeaturesValue += RATES.premiumFeatures.landscapedGarden; console.log('✓ Landscaped Garden: +400,000 RWF'); }
  if (input.hasModernKitchen) { premiumFeaturesValue += RATES.premiumFeatures.modernKitchen; console.log('✓ Modern Kitchen: +600,000 RWF'); }
  if (input.hasAirConditioning) { premiumFeaturesValue += RATES.premiumFeatures.airConditioning; console.log('✓ Air Conditioning: +300,000 RWF'); }
  if (input.hasFireplace) { premiumFeaturesValue += RATES.premiumFeatures.fireplace; console.log('✓ Fireplace: +250,000 RWF'); }
  if (input.hasBalcony) { premiumFeaturesValue += RATES.premiumFeatures.balcony; console.log('✓ Balcony: +300,000 RWF'); }
  if (input.hasGarage) { premiumFeaturesValue += RATES.premiumFeatures.garage; console.log('✓ Garage: +700,000 RWF'); }
  if (input.hasStaffQuarters) { premiumFeaturesValue += RATES.premiumFeatures.staffQuarters; console.log('✓ Staff Quarters: +1,000,000 RWF'); }
  if (input.hasStorageRoom) { premiumFeaturesValue += RATES.premiumFeatures.storageRoom; console.log('✓ Storage Room: +200,000 RWF'); }
  if (input.hasWaterHeater) { premiumFeaturesValue += RATES.premiumFeatures.waterHeater; console.log('✓ Water Heater: +150,000 RWF'); }
  if (input.hasIntercom) { premiumFeaturesValue += RATES.premiumFeatures.intercom; console.log('✓ Intercom: +80,000 RWF'); }
  
  // 10. VIEW PREMIUM
  const viewPremiumRate = RATES.viewPremium[input.viewType || 'None'];
  let viewPremiumValue = 0;
  if (viewPremiumRate > 0 && (landValue + buildingValue) > 0) {
    viewPremiumValue = (landValue + buildingValue) * viewPremiumRate;
    console.log(`View Premium (${input.viewType}): +${Math.round(viewPremiumRate * 100)}% = ${viewPremiumValue.toLocaleString()} RWF`);
  }
  
  // 11. UTILITIES BONUS
  let utilitiesBonusPercent = 0;
  if (input.hasElectricity) utilitiesBonusPercent += RATES.utilities.electricity;
  if (input.hasWaterSupply) utilitiesBonusPercent += RATES.utilities.waterSupply;
  if (input.hasWaterTank) utilitiesBonusPercent += RATES.utilities.waterTank;
  
  // 12. SUBTOTAL
  let baseSubtotal = landValue + buildingValue + floorValue + roomPremium + 
                     gardenValue + fenceValue + gateValue + parkingValue + 
                     annexValue + premiumFeaturesValue + viewPremiumValue;
  
  console.log(`\n--- Subtotal Breakdown ---`);
  console.log(`Land Value: ${landValue.toLocaleString()} RWF`);
  console.log(`Building Value: ${buildingValue.toLocaleString()} RWF`);
  console.log(`Room Premium: ${roomPremium.toLocaleString()} RWF`);
  console.log(`Garden Value: ${gardenValue.toLocaleString()} RWF`);
  console.log(`Fence Value: ${fenceValue.toLocaleString()} RWF`);
  console.log(`Gate Value: ${gateValue.toLocaleString()} RWF`);
  console.log(`Parking Value: ${parkingValue.toLocaleString()} RWF`);
  console.log(`Annex Value: ${annexValue.toLocaleString()} RWF`);
  console.log(`Premium Features: ${premiumFeaturesValue.toLocaleString()} RWF`);
  console.log(`View Premium: ${viewPremiumValue.toLocaleString()} RWF`);
  console.log(`Base Subtotal: ${baseSubtotal.toLocaleString()} RWF`);
  
  const utilitiesBonus = baseSubtotal * utilitiesBonusPercent;
  let subtotal = baseSubtotal + utilitiesBonus;
  console.log(`Utilities (${Math.round(utilitiesBonusPercent * 100)}%): +${utilitiesBonus.toLocaleString()} = ${subtotal.toLocaleString()} RWF`);
  
  // 13. CATEGORY MULTIPLIER
  const categoryMultiplier = RATES.propertyCategory[input.propertyCategory] ?? 1.0;
  subtotal = subtotal * categoryMultiplier;
  console.log(`Category (${input.propertyCategory}): ×${categoryMultiplier} = ${subtotal.toLocaleString()} RWF`);
  
  // 14. CONDITION MULTIPLIER
  const conditionMultiplier = RATES.conditionMultiplier[input.condition || 'GOOD'];
  subtotal = subtotal * conditionMultiplier;
  console.log(`Condition (${input.condition || 'GOOD'}): ×${conditionMultiplier} = ${subtotal.toLocaleString()} RWF`);
  
  // 15. NEIGHBORHOOD BONUSES
  const schoolBonus = proximityBonus(input.nearestSchoolKm || 2, RATES.neighborhood.school);
  const hospitalBonus = proximityBonus(input.nearestHospitalKm || 3, RATES.neighborhood.hospital);
  const transportBonus = proximityBonus(input.nearestTransportKm || 1, RATES.neighborhood.transport);
  const marketBonus = proximityBonus(input.nearestMarketKm || 1.5, RATES.neighborhood.market);
  
  let totalNeighbourhoodRate = schoolBonus + hospitalBonus + transportBonus + marketBonus;
  if (totalNeighbourhoodRate > RATES.caps.neighborhood) totalNeighbourhoodRate = RATES.caps.neighborhood;
  
  const neighbourhoodBonus = subtotal * totalNeighbourhoodRate;
  const roadRate = RATES.road[input.roadAccessType] ?? 0;
  const roadBonus = subtotal * roadRate;
  
  subtotal = subtotal + neighbourhoodBonus + roadBonus;
  console.log(`Neighborhood: +${neighbourhoodBonus.toLocaleString()} RWF`);
  console.log(`Road (${input.roadAccessType}): +${roadBonus.toLocaleString()} RWF`);
  
  // 16. FINAL VALUE
  const estimatedValue = subtotal > 0 ? Math.round(subtotal / 100000) * 100000 : 0;
  
  console.log(`\n=== FINAL VALUATION: ${estimatedValue.toLocaleString()} RWF ===\n`);
  
  // 17. CONFIDENCE SCORE
  let confidenceScore = 40;
  if (landSize > 0) confidenceScore += 10;
  if (buildingSize > 0) confidenceScore += 10;
  if (yearBuilt > 0 && yearBuilt !== currentYear) confidenceScore += 5;
  if (bedrooms > 0) confidenceScore += 5;
  if (bathrooms > 0) confidenceScore += 5;
  if (input.district && input.district !== 'default') confidenceScore += 5;
  confidenceScore = Math.min(confidenceScore, 95);
  
  const variance = confidenceScore >= 85 ? 0.06 : confidenceScore >= 70 ? 0.10 : confidenceScore >= 55 ? 0.15 : 0.20;
  
  const breakdown = {
    landValue: Math.round(landValue),
    buildingValue: Math.round(buildingValue),
    floorValue: Math.round(floorValue),
    buildingDepreciation: Math.round(depreciationAmount),
    roomPremium: Math.round(roomPremium),
    gardenValue: Math.round(gardenValue),
    fenceValue: Math.round(fenceValue),
    gateValue: Math.round(gateValue),
    parkingValue: Math.round(parkingValue),
    annexValue: Math.round(annexValue),
    premiumFeaturesValue: Math.round(premiumFeaturesValue),
    viewPremiumValue: Math.round(viewPremiumValue),
    utilitiesBonus: Math.round(utilitiesBonus),
    neighbourhoodBonus: Math.round(neighbourhoodBonus),
    roadBonus: Math.round(roadBonus),
    categoryMultiplier: categoryMultiplier,
    conditionMultiplier: conditionMultiplier,
    subtotal: Math.round(subtotal),
  };
  
  return {
    estimatedValue,
    confidenceScore,
    breakdown,
    features: breakdown,
    modelUsed: 'RULE_BASED_V2',
    priceRange: {
      min: subtotal > 0 ? Math.round((subtotal * (1 - variance)) / 100000) * 100000 : 0,
      max: subtotal > 0 ? Math.round((subtotal * (1 + variance)) / 100000) * 100000 : 0,
    },
    neighbourhoodScores: {
      school: Number((schoolBonus * 100).toFixed(2)),
      hospital: Number((hospitalBonus * 100).toFixed(2)),
      transport: Number((transportBonus * 100).toFixed(2)),
      market: Number((marketBonus * 100).toFixed(2)),
      road: Number((roadRate * 100).toFixed(2)),
      total: Number((totalNeighbourhoodRate * 100).toFixed(2)),
      capped: totalNeighbourhoodRate >= RATES.caps.neighborhood,
    },
    caps: {
      garden: gardenCapped,
      fence: fenceCapped,
      gate: gateCapped,
      parking: parkingCapped,
    }
  };
}