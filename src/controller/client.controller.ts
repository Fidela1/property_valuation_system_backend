import { Request, Response } from 'express';
import * as propertyService from '../services/client.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../utils/AppError';


export const createProperty = async (req: AuthRequest, res: Response) => {
  try {
    const userId= req.authenticatedUser?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Please login first.'
      });
    }
    
    const property = await propertyService.createProperty(userId, req.body);
    
    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: property
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Create property error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create property'
    });
  }
};

export const getMyProperties = async (req: AuthRequest, res: Response) => {
  try {
    const userId= req.authenticatedUser?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const { status, page, limit } = req.query;
    
    const result = await propertyService.getClientProperties(userId, {
      status: status as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10
    });
    
    res.json({
      success: true,
      data: {
        properties: result.properties,
        pagination: result.pagination,
        counts: result.counts
      }
    });
    
  } catch (error) {
    console.error('Get my properties error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch properties'
    });
  }
};

export const getPropertyById = async (req: AuthRequest, res: Response) => {
  try {
    const userId= req.authenticatedUser?.id;
       let { id } = req.params;
    
     if (Array.isArray(id)) {
      id = id[0];
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const property = await propertyService.getClientPropertyById(userId, id);
    
    res.json({
      success: true,
      data: property
    });
    
  } catch (error) {
    if (error instanceof AppError && error.message === 'Property not found') {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }
    
    console.error('Get property error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch property'
    });
  }
};

export const updateProperty = async (req: AuthRequest, res: Response) => {
  try {
    const userId= req.authenticatedUser?.id;
       let { id } = req.params;
    
     if (Array.isArray(id)) {
      id = id[0];
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const property = await propertyService.updateProperty(userId, id, req.body);
    
    res.json({
      success: true,
      message: 'Property updated successfully',
      data: property
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Update property error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update property'
    });
  }
};


export const deleteProperty = async (req: AuthRequest, res: Response) => {
  try {
    const userId= req.authenticatedUser?.id;
    let { id } = req.params;

     if (Array.isArray(id)) {
      id = id[0];
    }
    
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    await propertyService.deleteProperty(userId, id);
    
    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Delete property error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete property'
    });
  }
};

export const getPropertyTimeline = async (req: AuthRequest, res: Response) => {
  try {
    const userId= req.authenticatedUser?.id;
    let { id } = req.params;

     if (Array.isArray(id)) {
      id = id[0];
    }
    
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const timeline = await propertyService.getPropertyTimeline(userId, id);
    
    res.json({
      success: true,
      data: timeline
    });
    
  } catch (error) {
    if (error instanceof AppError && error.message === 'Property not found') {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }
    
    console.error('Get timeline error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch property timeline'
    });
  }
};