export interface PropertyFeatures {
  landSize: number;
  buildingSize: number;
  yearBuilt: number;
  propertyAge: number;
  bedrooms: number;
  bathrooms: number;
  parkingSpaces: number;
  hasElectricity: number;
  hasWaterSupply: number;
  hasWaterTank: number;
  floodRisk: number;
  propertyType: number;
  propertyCategory: number;
  landSlope: number;
  floorMaterial: number;
  roofType: number;
  roadAccessType: number;
  nearestSchoolKm: number;
  nearestHospitalKm: number;
  nearestTransportKm: number;
  nearestMarketKm: number;
  totalRooms: number;
  roomDensity: number;
  amenitiesScore: number;
  districtEncoded: number;
  // Premium features
  hasSwimmingPool?: number;
  hasGym?: number;
  hasSmartHome?: number;
  hasSolarPanels?: number;
  hasBackupGenerator?: number;
  hasSecuritySystem?: number;
  hasLandscapedGarden?: number;
  hasModernKitchen?: number;
  hasAirConditioning?: number;
  hasFireplace?: number;
  hasBalcony?: number;
  hasGarage?: number;
  hasStaffQuarters?: number;
  hasStorageRoom?: number;
  hasWaterHeater?: number;
  hasIntercom?: number;
  viewType?: number;
  condition?: number;
}

class FeatureBuilderService {
  // Encoding maps
  private districtEncoding: Record<string, number> = {
    'Gasabo': 10, 'Kicukiro': 9, 'Nyarugenge': 10,
    'Rubavu': 8, 'Musanze': 7, 'Huye': 6,
    'Rusizi': 6, 'Nyagatare': 5, 'Rwamagana': 5,
    'Muhanga': 5, 'Bugesera': 4, 'Kayonza': 4,
    'default': 5
  };

  private propertyTypeEncoding: Record<string, number> = {
    'BASIC': 0, 'STANDARD': 1, 'LUXURY': 2
  };

  private propertyCategoryEncoding: Record<string, number> = {
    'RESIDENTIAL': 0, 'COMMERCIAL': 1, 'LAND': 2, 'AGRICULTURAL': 3
  };

  private landSlopeEncoding: Record<string, number> = {
    'Flat': 0, 'Gentle': 1, 'Steep': 2, 'Hilly': 3
  };

  private floorMaterialEncoding: Record<string, number> = {
    'Cement': 0, 'Wood': 1, 'Tiles': 2, 'Marble': 3
  };

  private roofTypeEncoding: Record<string, number> = {
    'Concrete': 0, 'Tiles': 1, 'Iron sheets': 2, 'Thatched': 3
  };

  private roadAccessEncoding: Record<string, number> = {
    'DIRT': 0, 'UNDER_CONSTRUCTION': 1, 'UNPAVED': 2, 'PAVED': 3
  };

  private viewTypeEncoding: Record<string, number> = {
    'None': 0, 'Valley': 1, 'City': 2, 'Mountain': 3, 'Lake': 4
  };

  private conditionEncoding: Record<string, number> = {
    'NEEDS_RENOVATION': 0, 'FAIR': 1, 'GOOD': 2, 'EXCELLENT': 3
  };

  /**
   * Build features from valuation input
   */
  buildFeatures(input: any): PropertyFeatures {
    const currentYear = new Date().getFullYear();
    const propertyAge = currentYear - (input.yearBuilt ?? currentYear);
    const totalRooms = (input.bedrooms ?? 0) + (input.bathrooms ?? 0);
    const roomDensity = (input.buildingSize ?? 0) / Math.max(totalRooms, 1);
    
    // Calculate amenities score
    let amenitiesScore = this.calculateAmenitiesScore(input);
    
    return {
      landSize: input.landSize ?? 0,
      buildingSize: input.buildingSize ?? 0,
      yearBuilt: input.yearBuilt ?? currentYear,
      propertyAge: Math.max(0, propertyAge),
      bedrooms: input.bedrooms ?? 0,
      bathrooms: input.bathrooms ?? 0,
      parkingSpaces: input.parkingSpaces ?? 0,
      hasElectricity: input.hasElectricity ? 1 : 0,
      hasWaterSupply: input.hasWaterSupply ? 1 : 0,
      hasWaterTank: input.hasWaterTank ? 1 : 0,
      floodRisk: input.floodRisk ? 1 : 0,
      propertyType: this.propertyTypeEncoding[input.propertyType ?? 'STANDARD'] ?? 1,
      propertyCategory: this.propertyCategoryEncoding[input.propertyCategory ?? 'RESIDENTIAL'] ?? 0,
      landSlope: this.landSlopeEncoding[input.landSlope ?? 'Flat'] ?? 0,
      floorMaterial: this.floorMaterialEncoding[input.floorMaterial ?? 'Cement'] ?? 0,
      roofType: this.roofTypeEncoding[input.roofType ?? 'Concrete'] ?? 0,
      roadAccessType: this.roadAccessEncoding[input.roadAccessType ?? 'UNPAVED'] ?? 2,
      nearestSchoolKm: input.nearestSchoolKm ?? 0,
      nearestHospitalKm: input.nearestHospitalKm ?? 0,
      nearestTransportKm: input.nearestTransportKm ?? 0,
      nearestMarketKm: input.nearestMarketKm ?? 0,
      totalRooms,
      roomDensity,
      amenitiesScore: Math.min(Math.max(amenitiesScore, -5), 15),
      districtEncoded: this.districtEncoding[input.district] ?? 5,
      // Premium features
      hasSwimmingPool: input.hasSwimmingPool ? 1 : 0,
      hasGym: input.hasGym ? 1 : 0,
      hasSmartHome: input.hasSmartHome ? 1 : 0,
      hasSolarPanels: input.hasSolarPanels ? 1 : 0,
      hasBackupGenerator: input.hasBackupGenerator ? 1 : 0,
      hasSecuritySystem: input.hasSecuritySystem ? 1 : 0,
      hasLandscapedGarden: input.hasLandscapedGarden ? 1 : 0,
      hasModernKitchen: input.hasModernKitchen ? 1 : 0,
      hasAirConditioning: input.hasAirConditioning ? 1 : 0,
      hasFireplace: input.hasFireplace ? 1 : 0,
      hasBalcony: input.hasBalcony ? 1 : 0,
      hasGarage: input.hasGarage ? 1 : 0,
      hasStaffQuarters: input.hasStaffQuarters ? 1 : 0,
      hasStorageRoom: input.hasStorageRoom ? 1 : 0,
      hasWaterHeater: input.hasWaterHeater ? 1 : 0,
      hasIntercom: input.hasIntercom ? 1 : 0,
      viewType: this.viewTypeEncoding[input.viewType ?? 'None'] ?? 0,
      condition: this.conditionEncoding[input.condition ?? 'GOOD'] ?? 2
    };
  }

  /**
   * Calculate amenities score
   */
  private calculateAmenitiesScore(input: any): number {
    let score = 0;
    
    // Basic amenities
    if (input.hasElectricity) score += 1;
    if (input.hasWaterSupply) score += 1;
    if (input.hasWaterTank) score += 0.5;
    if (input.gardenSize && input.gardenSize > 0) score += 1;
    if (input.fenceHeight && input.fenceHeight > 0) score += 1;
    if (input.gateType) score += 1;
    if (input.parkingSpaces && input.parkingSpaces > 0) score += 1;
    
    // Premium features
    if (input.hasSwimmingPool) score += 2;
    if (input.hasGym) score += 1.5;
    if (input.hasSmartHome) score += 1.5;
    if (input.hasSolarPanels) score += 1;
    if (input.hasBackupGenerator) score += 1;
    if (input.hasSecuritySystem) score += 1;
    if (input.hasLandscapedGarden) score += 1;
    if (input.hasModernKitchen) score += 1;
    if (input.hasAirConditioning) score += 0.5;
    if (input.hasFireplace) score += 0.5;
    if (input.hasBalcony) score += 0.5;
    if (input.hasGarage) score += 1;
    if (input.hasStaffQuarters) score += 1.5;
    if (input.hasStorageRoom) score += 0.5;
    if (input.hasWaterHeater) score += 0.5;
    if (input.hasIntercom) score += 0.5;
    
    // Condition bonus
    if (input.condition === 'EXCELLENT') score += 2;
    if (input.condition === 'GOOD') score += 1;
    if (input.condition === 'FAIR') score -= 0.5;
    if (input.condition === 'NEEDS_RENOVATION') score -= 2;
    
    // View premium bonus
    if (input.viewType === 'Lake') score += 2;
    if (input.viewType === 'Mountain') score += 1.5;
    if (input.viewType === 'City') score += 1;
    if (input.viewType === 'Valley') score += 0.5;
    
    return score;
  }
}

export const featureBuilderService = new FeatureBuilderService();