import prisma from '../config/prisma';
import { calculateLiveValuation } from '../services/valuation.service';

/**
 * IMPORTANT:
 * We MUST keep feature order fixed for ML training
 */
const FEATURE_ORDER = [
  'landSize',
  'buildingSize',
  'yearBuilt',
  'propertyAge',
  'bedrooms',
  'bathrooms',
  'parkingSpaces',
  'hasElectricity',
  'hasWaterSupply',
  'hasWaterTank',
  'floodRisk',
  'propertyType',
  'propertyCategory',
  'landSlope',
  'floorMaterial',
  'roofType',
  'roadAccessType',
  'nearestSchoolKm',
  'nearestHospitalKm',
  'nearestTransportKm',
  'nearestMarketKm',
  'totalRooms',
  'roomDensity',
  'amenitiesScore',
  'districtEncoded'
];

/**
 * Convert FieldData + computed valuation → ML feature row
 */
function buildFeatureRow(fieldData: any, district: string) {
  const currentYear = new Date().getFullYear();
  
  // Calculate total rooms and room density
  const totalRooms = (fieldData.bedrooms ?? 0) + (fieldData.bathrooms ?? 0);
  const roomDensity = totalRooms > 0 ? (fieldData.buildingSize ?? 0) / totalRooms : 0;
  
  // Calculate amenities score
  let amenitiesScore = 0;
  if (fieldData.hasElectricity) amenitiesScore += 1;
  if (fieldData.hasWaterSupply) amenitiesScore += 1;
  if (fieldData.hasWaterTank) amenitiesScore += 0.5;
  if (fieldData.hasGarden) amenitiesScore += 1;
  if (fieldData.hasFence) amenitiesScore += 1;
  if (fieldData.hasGate) amenitiesScore += 1;
  if (fieldData.parkingSpaces && fieldData.parkingSpaces > 0) amenitiesScore += 1;
  
  // Premium features
  if (fieldData.hasSwimmingPool) amenitiesScore += 2;
  if (fieldData.hasGym) amenitiesScore += 1.5;
  if (fieldData.hasSmartHome) amenitiesScore += 1.5;
  if (fieldData.hasSolarPanels) amenitiesScore += 1;
  if (fieldData.hasBackupGenerator) amenitiesScore += 1;
  if (fieldData.hasSecuritySystem) amenitiesScore += 1;
  if (fieldData.hasLandscapedGarden) amenitiesScore += 1;
  if (fieldData.hasModernKitchen) amenitiesScore += 1;
  if (fieldData.hasAirConditioning) amenitiesScore += 0.5;
  if (fieldData.hasFireplace) amenitiesScore += 0.5;
  if (fieldData.hasBalcony) amenitiesScore += 0.5;
  if (fieldData.hasGarage) amenitiesScore += 1;
  if (fieldData.hasStaffQuarters) amenitiesScore += 1.5;
  if (fieldData.hasStorageRoom) amenitiesScore += 0.5;
  if (fieldData.hasWaterHeater) amenitiesScore += 0.5;
  if (fieldData.hasIntercom) amenitiesScore += 0.5;
  
  // Condition bonus
  if (fieldData.condition === 'EXCELLENT') amenitiesScore += 2;
  if (fieldData.condition === 'GOOD') amenitiesScore += 1;
  if (fieldData.condition === 'FAIR') amenitiesScore -= 0.5;
  if (fieldData.condition === 'NEEDS_RENOVATION') amenitiesScore -= 2;
  
  // View premium bonus
  if (fieldData.viewType === 'Lake') amenitiesScore += 2;
  if (fieldData.viewType === 'Mountain') amenitiesScore += 1.5;
  if (fieldData.viewType === 'City') amenitiesScore += 1;
  if (fieldData.viewType === 'Valley') amenitiesScore += 0.5;
  
  // District encoding
  const districtEncoding: Record<string, number> = {
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
    'default': 5,
  };
  
  const features = {
    landSize: fieldData.landSize ?? 0,
    buildingSize: fieldData.buildingSize ?? 0,
    yearBuilt: fieldData.yearBuilt ?? 2000,
    propertyAge: currentYear - (fieldData.yearBuilt ?? 2000),
    bedrooms: fieldData.bedrooms ?? 0,
    bathrooms: fieldData.bathrooms ?? 0,
    parkingSpaces: fieldData.parkingSpaces ?? 0,
    hasElectricity: fieldData.hasElectricity ? 1 : 0,
    hasWaterSupply: fieldData.hasWaterSupply ? 1 : 0,
    hasWaterTank: fieldData.hasWaterTank ? 1 : 0,
    floodRisk: fieldData.floodRisk ? 1 : 0,
    propertyType: fieldData.propertyType ?? 'STANDARD',
    propertyCategory: fieldData.propertyCategory ?? 'RESIDENTIAL',
    landSlope: fieldData.landSlope ?? 'Flat',
    floorMaterial: fieldData.floorMaterial ?? 'Cement',
    roofType: fieldData.roofType ?? 'Concrete',
    roadAccessType: fieldData.roadAccessType ?? 'UNPAVED',
    nearestSchoolKm: fieldData.nearestSchoolKm ?? 0,
    nearestHospitalKm: fieldData.nearestHospitalKm ?? 0,
    nearestTransportKm: fieldData.nearestTransportKm ?? 0,
    nearestMarketKm: fieldData.nearestMarketKm ?? 0,
    totalRooms: totalRooms,
    roomDensity: roomDensity,
    amenitiesScore: Math.min(Math.max(amenitiesScore, -5), 15),
    districtEncoded: districtEncoding[district] ?? 5
  };

  // convert object → ordered array (ML format)
  const featureRow = FEATURE_ORDER.map(
    (key) => (features as any)[key] ?? 0
  );

  return featureRow;
}

/**
 * Simple CSV export function
 */
export async function exportDatasetToCSV(dataset: any[]) {
  const fs = require('fs');
  const path = require('path');
  
  if (!dataset || dataset.length === 0) {
    throw new Error('No data to export');
  }

  // Create CSV header from the first item's features
  const firstItem = dataset[0];
  const featureNames = Array.from({ length: firstItem.features.length }, (_, i) => `feature_${i}`);
  
  // Create CSV rows
  const csvRows = [
    [...featureNames, 'label'].join(','), // Header row
    ...dataset.map((item: any) => [...item.features, item.label].join(','))
  ];

  const csvContent = csvRows.join('\n');
  
  // Ensure directory exists
  const exportDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  
  const fileName = `dataset_${Date.now()}.csv`;
  const filePath = path.join(exportDir, fileName);
  
  fs.writeFileSync(filePath, csvContent);
  
  return { path: filePath, count: dataset.length };
}

/**
 * MAIN DATASET GENERATOR
 */
export async function generateDataset() {
  const properties = await prisma.property.findMany({
    include: {
      fieldData: true
    }
  });

  const dataset: any[] = [];

  for (const property of properties) {
    if (!property.fieldData) continue;

    const fieldData = property.fieldData;

   const valuation = calculateLiveValuation({
  landSize: fieldData.landSize ?? 0,
  buildingSize: fieldData.buildingSize ?? 0,
  yearBuilt: fieldData.yearBuilt ?? 2000,

  propertyType: (fieldData.propertyType as any) ?? 'STANDARD',
  propertyCategory: (fieldData.propertyCategory as any) ?? 'RESIDENTIAL',

  bedrooms: fieldData.bedrooms ?? 0,
  bathrooms: fieldData.bathrooms ?? 0,

  // ✅ FIX: missing required fields
  gardenSize: fieldData.gardenSize ?? 0,
  fenceHeight: fieldData.fenceHeight ?? 0,
  gateType: (fieldData.gateType as any) ?? null,

  parkingSpaces: fieldData.parkingSpaces ?? 0,

  hasElectricity: fieldData.hasElectricity ?? true,
  hasWaterSupply: fieldData.hasWaterSupply ?? true,
  hasWaterTank: fieldData.hasWaterTank ?? false,

  floodRisk: fieldData.floodRisk ?? false,
  landSlope: (fieldData.landSlope as any) ?? 'Flat',

  floorMaterial: (fieldData.floorMaterial as any) ?? 'Cement',
  roofType: (fieldData.roofType as any) ?? 'Concrete',

  district: property.district,

  nearestSchoolKm: fieldData.nearestSchoolKm ?? 0,
  nearestHospitalKm: fieldData.nearestHospitalKm ?? 0,
  nearestTransportKm: fieldData.nearestTransportKm ?? 0,
  nearestMarketKm: fieldData.nearestMarketKm ?? 0,

  roadAccessType: (fieldData.roadAccessType as any) ?? 'UNPAVED'
});

    const features = buildFeatureRow(fieldData, property.district);

    dataset.push({
      features,
      label: valuation.estimatedValue
    });
  }

  console.log('Generated dataset size:', dataset.length);

  // export to CSV using local function
  const result = await exportDatasetToCSV(dataset);

  return result;
}

/**
 * CLI RUNNER
 */
async function run() {
  try {
    const result = await generateDataset();
    console.log('Dataset saved at:', result.path);
    console.log('Total records:', result.count);
  } catch (err) {
    console.error('Dataset generation failed:', err);
  }
}

run();