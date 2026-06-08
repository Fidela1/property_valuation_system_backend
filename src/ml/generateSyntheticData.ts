import prisma from '../config/prisma';

async function generateSyntheticData() {
  console.log('Starting synthetic data generation...');
  
  // First, get a client user to associate properties with
  const client = await prisma.user.findFirst({
    where: { role: 'CLIENT' }
  });
  
  if (!client) {
    console.error('No client user found. Please create a client user first.');
    console.log('You can run: npx prisma studio and add a user with CLIENT role');
    return;
  }
  
  console.log(`Using client: ${client.name} (${client.id})`);
  
  const districts = ['Gasabo', 'Kicukiro', 'Nyarugenge', 'Musanze', 'Rubavu', 'Huye'];
  const propertyTypes = ['HOUSE', 'APARTMENT', 'VILLA', 'LAND', 'COMMERCIAL'];
  const conditions = ['EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_RENOVATION'];
  const landSlopes = ['Flat', 'Gentle', 'Steep', 'Hilly'];
  const floorMaterials = ['Cement', 'Tiles', 'Wood', 'Marble'];
  const roofTypes = ['Concrete', 'Tiles', 'Iron sheets', 'Thatched'];
  const roadTypes = ['PAVED', 'UNPAVED', 'DIRT', 'UNDER_CONSTRUCTION'];
  const gateTypes = ['AUTOMATIC', 'SLIDING', 'SWING', 'MANUAL'];
  const viewTypes = ['None', 'Lake', 'Mountain', 'City', 'Valley'];
  
  let successCount = 0;
  
  for (let i = 0; i < 100; i++) {
    try {
      const district = districts[Math.floor(Math.random() * districts.length)];
      const propertyType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      const roadAccessType = roadTypes[Math.floor(Math.random() * roadTypes.length)];
      
      // Create a property
      const property = await prisma.property.create({
        data: {
          upiNumber: `SYN-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`,
          idOrTin: `123456789${Math.floor(Math.random() * 1000)}`,
          phoneNumber: `078${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
          ownerName: `Synthetic Owner ${i}`,
          country: 'Rwanda',
          province: ['Kigali', 'Northern', 'Western', 'Southern', 'Eastern'][Math.floor(Math.random() * 5)],
          district: district,
          sector: 'Test Sector',
          cell: 'Test Cell',
          village: 'Test Village',
          status: 'APPROVED',
          clientId: client.id,
        }
      });
      
      // Generate random values
      const landSize = Math.random() * 1000 + 100;
      const buildingSize = Math.random() * 500 + 50;
      const bedrooms = Math.floor(Math.random() * 5) + 1;
      const bathrooms = Math.floor(Math.random() * 3) + 1;
      const parkingSpaces = Math.floor(Math.random() * 3);
      const gardenSize = Math.random() * 200;
      const fenceHeight = Math.random() * 2;
      const yearBuilt = 2000 + Math.floor(Math.random() * 23);
      
      // Generate random GPS coordinates for Rwanda (approximately)
      const latitude = -1.9441 + (Math.random() - 0.5) * 2;
      const longitude = 29.8739 + (Math.random() - 0.5) * 2;
      
      // Map property type to BASIC/STANDARD/LUXURY for the valuation
      const valuationPropertyType = propertyType === 'VILLA' ? 'LUXURY' : 
                                     propertyType === 'COMMERCIAL' ? 'STANDARD' : 
                                     propertyType === 'HOUSE' ? 'STANDARD' : 'BASIC';
      
      // Calculate valuation based on features (for synthetic data)
      let baseValue = landSize * 50000 + buildingSize * 180000;
      if (valuationPropertyType === 'LUXURY') baseValue *= 1.5;
      if (valuationPropertyType === 'BASIC') baseValue *= 0.7;
      if (condition === 'EXCELLENT') baseValue *= 1.2;
      if (condition === 'GOOD') baseValue *= 1.0;
      if (condition === 'FAIR') baseValue *= 0.85;
      if (condition === 'NEEDS_RENOVATION') baseValue *= 0.6;
      if (district === 'Gasabo') baseValue *= 1.3;
      if (district === 'Nyarugenge') baseValue *= 1.2;
      if (district === 'Kicukiro') baseValue *= 1.1;
      
      await prisma.fieldData.create({
        data: {
          propertyId: property.id,
          // Required fields
          latitude: latitude,
          longitude: longitude,
          // Optional fields with defaults
          landSize: landSize,
          buildingSize: buildingSize,
          bedrooms: bedrooms,
          bathrooms: bathrooms,
          yearBuilt: yearBuilt,
          parkingSpaces: parkingSpaces,
          hasElectricity: Math.random() > 0.1,
          hasWaterSupply: Math.random() > 0.1,
          hasWaterTank: Math.random() > 0.5,
          floodRisk: Math.random() > 0.9,
          landSlope: landSlopes[Math.floor(Math.random() * landSlopes.length)],
          floorMaterial: floorMaterials[Math.floor(Math.random() * floorMaterials.length)],
          roofType: roofTypes[Math.floor(Math.random() * roofTypes.length)],
          propertyType: propertyType as any,
          propertyCategory: 'RESIDENTIAL',
          nearestSchoolKm: Math.random() * 3,
          nearestHospitalKm: Math.random() * 5,
          nearestTransportKm: Math.random() * 2,
          nearestMarketKm: Math.random() * 2,
          roadAccessType: roadAccessType as any,
          gardenSize: gardenSize,
          fenceHeight: fenceHeight,
          gateType: gateTypes[Math.floor(Math.random() * gateTypes.length)],
          condition: condition as any,
          hasGarden: Math.random() > 0.5,
          hasGate: Math.random() > 0.5,
          hasFence: Math.random() > 0.5,
          
          // Premium features
          hasSwimmingPool: Math.random() > 0.9,
          hasGym: Math.random() > 0.95,
          hasSmartHome: Math.random() > 0.9,
          hasSolarPanels: Math.random() > 0.85,
          hasBackupGenerator: Math.random() > 0.8,
          hasSecuritySystem: Math.random() > 0.7,
          hasLandscapedGarden: Math.random() > 0.8,
          hasModernKitchen: Math.random() > 0.6,
          hasAirConditioning: Math.random() > 0.7,
          hasFireplace: Math.random() > 0.95,
          hasBalcony: Math.random() > 0.7,
          hasGarage: Math.random() > 0.8,
          hasStaffQuarters: Math.random() > 0.95,
          hasStorageRoom: Math.random() > 0.8,
          hasWaterHeater: Math.random() > 0.7,
          hasIntercom: Math.random() > 0.9,
          viewType: viewTypes[Math.floor(Math.random() * viewTypes.length)],
          
          valuationAmount: baseValue,
          valuationConfidence: 70 + Math.random() * 20,
          valuationMethod: 'AI'
        }
      });
      
      successCount++;
      if ((i + 1) % 10 === 0) {
        console.log(`Created ${successCount} synthetic properties...`);
      }
    } catch (error) {
      console.error(`Failed to create property ${i}:`, error);
    }
  }
  
  console.log(`\n✅ Synthetic data generation complete!`);
  console.log(`Successfully created ${successCount} properties with field data`);
}

generateSyntheticData()
  .catch(console.error)
  .finally(() => process.exit());