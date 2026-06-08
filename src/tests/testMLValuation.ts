import { calculateLiveValuation } from '../services/valuation.service';

async function testMLValuation() {
  const testProperty = {
    landSize: 500,
    buildingSize: 200,
    yearBuilt: 2015,
    propertyType: 'STANDARD',
    propertyCategory: 'RESIDENTIAL',
    bedrooms: 3,
    bathrooms: 2,
    gardenSize: 100,
    fenceHeight: 1.5,
    gateType: 'AUTOMATIC',
    parkingSpaces: 2,
    hasElectricity: true,
    hasWaterSupply: true,
    hasWaterTank: true,
    floodRisk: false,
    landSlope: 'Flat',
    floorMaterial: 'Tiles',
    roofType: 'Concrete',
    district: 'Gasabo',
    nearestSchoolKm: 0.5,
    nearestHospitalKm: 1.0,
    nearestTransportKm: 0.3,
    nearestMarketKm: 0.8,
    roadAccessType: 'PAVED',
    hasSwimmingPool: true,
    hasGym: true,
    hasSmartHome: true
  };
  
  console.log('Testing ML-Enhanced Valuation...');
  const valuation = await calculateLiveValuation(testProperty, true);
  
  console.log('\nResults:');
  console.log(`Estimated Value: ${valuation.estimatedValue.toLocaleString()} RWF`);
  console.log(`Confidence Score: ${valuation.confidenceScore}%`);
  if ((valuation as any).mlValuation) {
    console.log(`ML Value: ${(valuation as any).mlValuation.toLocaleString()} RWF`);
    console.log(`Rule-based Value: ${(valuation as any).ruleBasedValue.toLocaleString()} RWF`);
    console.log(`Method: ${(valuation as any).valuationMethod}`);
    console.log(`Recommendation: ${(valuation as any).recommendation}`);
  }
}

testMLValuation().catch(console.error);