import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';

export const RATES = {

  land: {

    'Gasabo':     45000,
    'Kicukiro':   40000,
    'Nyarugenge': 50000,
    'Musanze':    15000,
    'Burera':      6000,
    'Gakenke':     5000,
    'Gicumbi':     5500,
    'Rulindo':     5000,
    'Huye':       12000,
    'Gisagara':    4500,
    'Kamonyi':     5000,
    'Muhanga':     7000,
    'Nyamagabe':   4000,
    'Nyanza':      5000,
    'Nyaruguru':   3500,
    'Ruhango':     4500,
    'Bugesera':    6000,
    'Gatsibo':     4000,
    'Kayonza':     4500,
    'Kirehe':      4000,
    'Ngoma':       4500,
    'Nyagatare':   8000,
    'Rwamagana':   7000,
    'Karongi':     5500,
    'Ngororero':   4500,
    'Nyabihu':     5000,
    'Nyamasheke':  4500,
    'Rubavu':     18000,
    'Rutsiro':     4000,
    'Rusizi':     10000,
    'default':     5000
  },

  building: {
    'LUXURY':   350000,
    'STANDARD': 180000,
    'BASIC':    100000,
    'default':  150000
  },

  garden:  5000,    
  fence:   15000,   
  parking: 500000,   

  gate: {
    'AUTOMATIC': 1500000,
    'SLIDING':    800000,
    'SWING':      400000,
    'MANUAL':     200000
  },

  extraBedroom:  2000000,
  extraBathroom: 1000000,

  depreciationRate: 0.01,   
  maxDepreciation:  0.30,   

  caps: {
    garden:       0.15,
    fence:        0.10,
    gate:         0.05,
    parking:      0.08,
    neighborhood: 0.15   
  },

  propertyCategory: {
    'RESIDENTIAL':   1.0,
    'COMMERCIAL':    1.3,
    'LAND':          0.7,
    'AGRICULTURAL':  0.5
  } as Record<string, number>,

  utilities: {
    electricity: 0.02,  
    waterSupply: 0.02,   
    waterTank:   0.01    
  },

  landSlope: {
    'Flat':      0.00,
    'Gentle':   -0.02,
    'Steep':    -0.05,
    'Hilly':    -0.08
  } as Record<string, number>,

  floodRisk: -0.10,     
  floorMaterial: {
    'Marble':    150000,
    'Tiles':      80000,
    'Wood':       60000,
    'Cement':     30000,
    'Default':    20000
  } as Record<string, number>,

  roofType: {
    'Concrete':    0.00,
    'Tiles':       0.02,
    'Iron sheets':-0.01,
    'Thatched':   -0.05
  } as Record<string, number>,

  neighborhood: {
    school: {
      maxBonus:   0.04,
      tiers: [
        { maxKm: 0.5, factor: 1.0 },
        { maxKm: 1.0, factor: 0.6 },
        { maxKm: 2.0, factor: 0.3 }
      ]
    },
    hospital: {
      maxBonus:   0.03,
      tiers: [
        { maxKm: 1.0, factor: 1.0 },
        { maxKm: 2.0, factor: 0.6 },
        { maxKm: 4.0, factor: 0.3 }
      ]
    },
    transport: {
      maxBonus:   0.03,
      tiers: [
        { maxKm: 0.3, factor: 1.0 },
        { maxKm: 0.5, factor: 0.6 },
        { maxKm: 1.0, factor: 0.3 }
      ]
    },
    market: {
      maxBonus:   0.02,
      tiers: [
        { maxKm: 0.5, factor: 1.0 },
        { maxKm: 1.0, factor: 0.5 },
        { maxKm: 2.0, factor: 0.2 }
      ]
    }
  },

  road: {
    'PAVED':              0.03,
    'UNPAVED':            0.00,
    'DIRT':              -0.02,
    'UNDER_CONSTRUCTION': -0.01
  }
};


export interface ValuationInput {
  // Core dimensions
  landSize:     number;
  buildingSize: number;
  yearBuilt:    number;
  propertyType: 'BASIC' | 'STANDARD' | 'LUXURY';
  propertyCategory: 'RESIDENTIAL' | 'COMMERCIAL' | 'LAND' | 'AGRICULTURAL';
  
  // Rooms
  bedrooms:  number;
  bathrooms: number;
  
  // Amenities
  gardenSize:    number;
  fenceHeight:   number;
  gateType:      'AUTOMATIC' | 'SLIDING' | 'SWING' | 'MANUAL' | null;
  parkingSpaces: number;
  
  // Utilities
  hasElectricity: boolean;
  hasWaterSupply: boolean;
  hasWaterTank:   boolean;
  
  // Land characteristics
  floodRisk:  boolean;
  landSlope:  'Flat' | 'Gentle' | 'Steep' | 'Hilly';
  
  // Building finishes
  floorMaterial: 'Marble' | 'Tiles' | 'Wood' | 'Cement';
  roofType:      'Concrete' | 'Tiles' | 'Iron sheets' | 'Thatched';
  
  // Location
  district: string;
  nearestSchoolKm:    number;
  nearestHospitalKm:  number;
  nearestTransportKm: number;
  nearestMarketKm:    number;

  roadAccessType: 'PAVED' | 'UNPAVED' | 'DIRT' | 'UNDER_CONSTRUCTION';
  
  currentYear?: number;
}

export interface ValuationBreakdown {
  landValue:           number;
  buildingValue:       number;
  floorValue:          number;
  buildingDepreciation:number;
  roomPremium:         number;
  gardenValue:         number;
  fenceValue:          number;
  gateValue:           number;
  parkingValue:        number;
  utilitiesBonus:      number;
  neighbourhoodBonus:  number;
  roadBonus:           number;
  categoryMultiplier:  number;
  subtotal:            number;
}

export interface ValuationOutput {
  estimatedValue:  number;
  confidenceScore: number;
  breakdown:       ValuationBreakdown;
  priceRange: {
    min: number;
    max: number;
  };
  neighbourhoodScores: {
    school:    number;
    hospital:  number;
    transport: number;
    market:    number;
    road:      number;
    total:     number;
    capped:    boolean;
  };
  caps: {
    garden:  boolean;
    fence:   boolean;
    gate:    boolean;
    parking: boolean;
  };
}

const proximityBonus = (
  distanceKm: number,
  config: { maxBonus: number; tiers: { maxKm: number; factor: number }[] }
): number => {
  for (const tier of config.tiers) {
    if (distanceKm <= tier.maxKm) {
      return config.maxBonus * tier.factor;
    }
  }
  return 0;
};


export const calculateLiveValuation = (input: ValuationInput): ValuationOutput => {
  const currentYear = input.currentYear ?? new Date().getFullYear();
  const landRate = RATES.land[input.district as keyof typeof RATES.land] ?? RATES.land.default;
  let landValue = (input.landSize || 0) * (landRate || 0);

  const slopeAdjustment = RATES.landSlope[input.landSlope] ?? 0;
  landValue = landValue * (1 + (slopeAdjustment || 0));

  if (input.floodRisk) {
    landValue = landValue * (1 + (RATES.floodRisk || 0));
  }
  let buildingValue = 0;
  let floorValue = 0;
  let depreciationAmount = 0;
  
  if (input.propertyCategory !== 'LAND' && (input.buildingSize || 0) > 0) {
    const buildingRate = RATES.building[input.propertyType] ?? RATES.building.default;
    const rawBuildingValue = (input.buildingSize || 0) * (buildingRate || 0);
    
    const age = Math.max(0, currentYear - (input.yearBuilt || currentYear));
    const depreciation = Math.min(age * (RATES.depreciationRate || 0.01), RATES.maxDepreciation || 0.3);
    depreciationAmount = rawBuildingValue * (depreciation || 0);
    buildingValue = rawBuildingValue - depreciationAmount;
 
    const floorRate = RATES.floorMaterial[input.floorMaterial] ?? RATES.floorMaterial.Default;
    floorValue = (input.buildingSize || 0) * (floorRate || 0);

    const roofAdjustment = RATES.roofType[input.roofType] ?? 0;
    buildingValue = buildingValue * (1 + (roofAdjustment || 0));
  }
  let roomPremium = 0;
  if (input.propertyCategory !== 'LAND' && (input.buildingSize || 0) > 0) {
    const extraBedrooms = Math.max(0, (input.bedrooms || 0) - 2);
    const extraBathrooms = Math.max(0, (input.bathrooms || 0) - 1);
    roomPremium = (extraBedrooms * (RATES.extraBedroom || 2000000)) + (extraBathrooms * (RATES.extraBathroom || 1000000));
  }

  const gardenCap = landValue * (RATES.caps.garden || 0.15);
  const rawGardenValue = (input.gardenSize || 0) * (RATES.garden || 5000);
  const gardenCapped = rawGardenValue > gardenCap;
  const gardenValue = gardenCapped ? gardenCap : (rawGardenValue || 0);
  const fenceCap = landValue * (RATES.caps.fence || 0.10);
  const rawFenceValue = (input.fenceHeight || 0) * (RATES.fence || 15000);
  const fenceCapped = rawFenceValue > fenceCap;
  const fenceValue = fenceCapped ? fenceCap : (rawFenceValue || 0);
  const gateCap = landValue * (RATES.caps.gate || 0.05);
  const rawGateValue = input.gateType ? (RATES.gate[input.gateType] || 0) : 0;
  const gateCapped = rawGateValue > gateCap;
  const gateValue = gateCapped ? gateCap : (rawGateValue || 0);
  const parkingCap = landValue * (RATES.caps.parking || 0.08);
  const rawParkingValue = (input.parkingSpaces || 0) * (RATES.parking || 500000);
  const parkingCapped = rawParkingValue > parkingCap;
  const parkingValue = parkingCapped ? parkingCap : (rawParkingValue || 0);
  let utilitiesBonusPercent = 0;
  if (input.hasElectricity) utilitiesBonusPercent += (RATES.utilities?.electricity || 0.02);
  if (input.hasWaterSupply) utilitiesBonusPercent += (RATES.utilities?.waterSupply || 0.02);
  if (input.hasWaterTank) utilitiesBonusPercent += (RATES.utilities?.waterTank || 0.01);

  let baseSubtotal = (landValue || 0) + (buildingValue || 0) + (floorValue || 0) + (roomPremium || 0) + 
                     (gardenValue || 0) + (fenceValue || 0) + (gateValue || 0) + (parkingValue || 0);

  const utilitiesBonus = (baseSubtotal || 0) * (utilitiesBonusPercent || 0);
  let subtotal = (baseSubtotal || 0) + (utilitiesBonus || 0);

  const categoryMultiplier = RATES.propertyCategory[input.propertyCategory] ?? 1.0;
  subtotal = (subtotal || 0) * (categoryMultiplier || 1);
  const schoolBonus = proximityBonus(input.nearestSchoolKm || 2, RATES.neighborhood.school);
  const hospitalBonus = proximityBonus(input.nearestHospitalKm || 3, RATES.neighborhood.hospital);
  const transportBonus = proximityBonus(input.nearestTransportKm || 1, RATES.neighborhood.transport);
  const marketBonus = proximityBonus(input.nearestMarketKm || 1.5, RATES.neighborhood.market);

  let totalNeighbourhoodRate = (schoolBonus || 0) + (hospitalBonus || 0) + (transportBonus || 0) + (marketBonus || 0);
  const neighbourhoodCapped = totalNeighbourhoodRate > (RATES.caps.neighborhood || 0.15);
  if (neighbourhoodCapped) totalNeighbourhoodRate = (RATES.caps.neighborhood || 0.15);

  const neighbourhoodBonus = (subtotal || 0) * (totalNeighbourhoodRate || 0);
  const roadRate = RATES.road[input.roadAccessType] ?? 0;
  const roadBonus = (subtotal || 0) * (roadRate || 0);

  subtotal = (subtotal || 0) + (neighbourhoodBonus || 0) + (roadBonus || 0);

  const estimatedValue = subtotal > 0 ? Math.round((subtotal || 0) / 100000) * 100000 : 0;

  let confidenceScore = 40;
  if ((input.landSize || 0) > 0) confidenceScore += 10;
  if ((input.buildingSize || 0) > 0) confidenceScore += 10;
  if ((input.yearBuilt || 0) > 0) confidenceScore += 5;
  if ((input.bedrooms || 0) > 0) confidenceScore += 5;
  if ((input.bathrooms || 0) > 0) confidenceScore += 5;
  if (input.district && input.district !== 'default') confidenceScore += 5;
  if (input.propertyCategory !== 'LAND') confidenceScore += 5;
  if (input.hasElectricity) confidenceScore += 3;
  if (input.hasWaterSupply) confidenceScore += 3;
  if ((input.nearestSchoolKm || 0) > 0 && (input.nearestSchoolKm || 0) < 5) confidenceScore += 2;
  if ((input.nearestHospitalKm || 0) > 0 && (input.nearestHospitalKm || 0) < 5) confidenceScore += 2;
  if (input.floorMaterial && input.floorMaterial !== 'Cement') confidenceScore += 3;
  confidenceScore = Math.min(confidenceScore, 95);

  const variance = confidenceScore >= 85 ? 0.06 :
                   confidenceScore >= 70 ? 0.10 :
                   confidenceScore >= 55 ? 0.15 : 0.20;

  return {
    estimatedValue: estimatedValue || 0,
    confidenceScore: confidenceScore || 0,
    breakdown: {
      landValue: Math.round(landValue || 0),
      buildingValue: Math.round(buildingValue || 0),
      floorValue: Math.round(floorValue || 0),
      buildingDepreciation: Math.round(depreciationAmount || 0),
      roomPremium: Math.round(roomPremium || 0),
      gardenValue: Math.round(gardenValue || 0),
      fenceValue: Math.round(fenceValue || 0),
      gateValue: Math.round(gateValue || 0),
      parkingValue: Math.round(parkingValue || 0),
      utilitiesBonus: Math.round(utilitiesBonus || 0),
      neighbourhoodBonus: Math.round(neighbourhoodBonus || 0),
      roadBonus: Math.round(roadBonus || 0),
      categoryMultiplier: categoryMultiplier || 1,
      subtotal: Math.round(subtotal || 0),
    },
    priceRange: {
      min: subtotal > 0 ? Math.round((subtotal * (1 - variance) / 100000)) * 100000 : 0,
      max: subtotal > 0 ? Math.round((subtotal * (1 + variance) / 100000)) * 100000 : 0,
    },
    neighbourhoodScores: {
      school: Number(((schoolBonus || 0) * 100).toFixed(2)),
      hospital: Number(((hospitalBonus || 0) * 100).toFixed(2)),
      transport: Number(((transportBonus || 0) * 100).toFixed(2)),
      market: Number(((marketBonus || 0) * 100).toFixed(2)),
      road: Number(((roadRate || 0) * 100).toFixed(2)),
      total: Number(((totalNeighbourhoodRate || 0) * 100).toFixed(2)),
      capped: neighbourhoodCapped || false,
    },
    caps: {
      garden: gardenCapped || false,
      fence: fenceCapped || false,
      gate: gateCapped || false,
      parking: parkingCapped || false,
    }
  };
};

export const saveValuationToProperty = async (
  propertyId: string,
  valuation: ValuationOutput
) => {
  const property = await prisma.property.update({
    where: { id: propertyId },
    data: {
      aiValuation:  valuation.estimatedValue,
      aiConfidence: valuation.confidenceScore,
      aiFactors:    valuation.breakdown as any,
    }
  });
  return property;
};