import { Request, Response } from 'express';
import { geocodeRwandaAddress, buildRwandaAddress } from '../services/geocoding.service';

export async function testGeocode(req: Request, res: Response) {
  try {
    const { province, district, sector, cell, village } = req.query;
    
    const address = {
      province: province as string,
      district: district as string,
      sector: sector as string,
      cell: cell as string,
      village: village as string
    };
    console.log("hhhhhhhhhhhhhhhh", address)
    const fullAddress = buildRwandaAddress(address);
    const coordinates = await geocodeRwandaAddress(address);
    
    res.json({
      success: !!coordinates,
      input: address,
      fullAddress,
      coordinates,
      message: coordinates ? 'Geocoding successful' : 'Geocoding failed'
    });
    
  } catch (error) {
      res.status(500).json({
      success: false,
      error: 'Failed to fetch properties'
    });
  }
}