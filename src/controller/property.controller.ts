// controllers/property.controller.ts
import { Request, Response } from 'express';
import * as propertyService from '../services/property.service';

export const getPublishedProperties = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const search = req.query.search as string;
    const district = req.query.district as string;
    const propertyType = req.query.propertyType as string;
    const minPrice = req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined;
    
    const result = await propertyService.getPublishedProperties({
      page,
      limit,
      search,
      district,
      propertyType,
      minPrice,
      maxPrice
    });
    
    res.json({
      success: true,
      data: result.properties,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching published properties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch properties'
    });
  }
};

export const getPublishedPropertyById = async (req: Request, res: Response) => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) {
      id = id[0];
    }
    
    const property = await propertyService.getPublishedPropertyById(id);
    
    res.json({
      success: true,
      data: property
    });
  } catch (error: any) {
    console.error('Error fetching property:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Property not found'
    });
  }
};