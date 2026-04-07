import axios from 'axios';

const addressCache = new Map();

const provinceMapping: Record<string, string> = {
  'nothern': 'Northern Province',
  'northern': 'Northern Province',
  'north': 'Northern Province',
  'eastern': 'Eastern Province',
  'southern': 'Southern Province',
  'western': 'Western Province',
  'kigali': 'Kigali City',
  'kigali city': 'Kigali City'
};

const knownDistricts: Record<string, { lat: number; lng: number }> = {
  'Musanze': { lat: -1.4997, lng: 29.6344 },
  'Ruhengeri': { lat: -1.4997, lng: 29.6344 },
  'Gasabo': { lat: -1.9441, lng: 30.0619 },
  'Kicukiro': { lat: -1.9789, lng: 30.1035 },
  'Nyarugenge': { lat: -1.9441, lng: 30.0619 }
};

function normalizeProvince(province: string): string {
  const normalized = province.toLowerCase().trim();
  return provinceMapping[normalized] || province;
}

export async function geocodeRwandaAddress(data: {
  street?: string;
  village?: string;
  cell?: string;
  sector?: string;
  district: string;
  province: string;
}) {
  
  const correctedProvince = normalizeProvince(data.province);
  const district = data.district;
  
  const cacheKey = `${district}|${correctedProvince}`.toLowerCase();
  
  if (addressCache.has(cacheKey)) {
    console.log('Using cached coordinates');
    return addressCache.get(cacheKey);
  }
  
  console.log(' Structured query:', { county: district, state: correctedProvince, country: 'Rwanda' });
  
  try {

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        county: district,    
        state: correctedProvince,
        country: 'Rwanda',
        format: 'json',
        limit: 1,
        'accept-language': 'en'
      },
      headers: {
        'User-Agent': 'PropertyValuationApp/1.0 (your-email@example.com)'
      },
      timeout: 8000
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      const coordinates = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: result.display_name
      };
      
      addressCache.set(cacheKey, coordinates);
      console.log(' Structured query succeeded!');
      return coordinates;
    }
    
    console.log(' Structured query failed, trying free-form...');
 
    const fallbackResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: `${district}, Rwanda`,
        format: 'json',
        limit: 1,
        'accept-language': 'en'
      },
      headers: {
        'User-Agent': 'PropertyValuationApp/1.0 (your-email@example.com)'
      },
      timeout: 5000
    });
    
    if (fallbackResponse.data && fallbackResponse.data.length > 0) {
      const result = fallbackResponse.data[0];
      const coordinates = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        formattedAddress: result.display_name
      };
      
      addressCache.set(cacheKey, coordinates);
      console.log(' Fallback query succeeded!');
      return coordinates;
    }
    
    if (knownDistricts[district]) {
      console.log(`Using manual coordinates for ${district}`);
      const coordinates = {
        latitude: knownDistricts[district].lat,
        longitude: knownDistricts[district].lng,
        formattedAddress: `${district}, ${correctedProvince}, Rwanda (approximate)`
      };
      addressCache.set(cacheKey, coordinates);
      return coordinates;
    }
    
    console.log('All geocoding strategies failed');
    return null;
    
  } catch (error) {
    console.error(' Geocoding error:');
    

    if (knownDistricts[district]) {
      console.log(`Using manual coordinates for ${district} (due to error)`);
      return {
        latitude: knownDistricts[district].lat,
        longitude: knownDistricts[district].lng,
        formattedAddress: `${district}, ${correctedProvince}, Rwanda (approximate)`
      };
    }
    
    return null;
  }
}

export function buildRwandaAddress(data: {
  street?: string;
  village?: string;
  cell?: string;
  sector?: string;
  district: string;
  province: string;
}) {
  const parts = [];
  if (data.village) parts.push(data.village);
  if (data.cell) parts.push(data.cell);
  if (data.sector) parts.push(data.sector);
  if (data.district) parts.push(data.district);
  parts.push(normalizeProvince(data.province));
  parts.push('Rwanda');
  return parts.join(', ');
}