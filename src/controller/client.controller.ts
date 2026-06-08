import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../utils/AppError';
import * as clientService from '../services/client.service';

// Helper function to safely get string parameter (defined ONCE at the top)
const getParamAsString = (param: string | string[] | undefined): string => {
  if (!param) return '';
  return Array.isArray(param) ? param[0] : param;
};

export const createProperty = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.authenticatedUser?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized. Please login first.'
      });
    }
    
    const property = await clientService.createProperty(userId, req.body);
    
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
    const userId = req.authenticatedUser?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const { status, page, limit } = req.query;
    
    const result = await clientService.getClientProperties(userId, {
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
    const userId = req.authenticatedUser?.id;
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
    
    const property = await clientService.getClientPropertyById(userId, id);
    
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
    const userId = req.authenticatedUser?.id;
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
    
    const property = await clientService.updateProperty(userId, id, req.body);
    
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
    const userId = req.authenticatedUser?.id;
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
    
    await clientService.deleteProperty(userId, id);
    
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
    const userId = req.authenticatedUser?.id;
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
    
    const timeline = await clientService.getPropertyTimeline(userId, id);
    
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

// ===== ACCESS CONTROL FUNCTIONS =====

export const getClientPropertiesWithAccess = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.authenticatedUser?.id;
    if (!clientId) {
      throw new AppError('Unauthorized', 401);
    }

    const properties = await clientService.getClientPropertiesWithAccess(clientId);
    res.json({ success: true, data: properties });
  } catch (error) {
    console.error('Get client properties error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch properties'
    });
  }
};

export const getAccessRequests = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.authenticatedUser?.id;
    if (!clientId) {
      throw new AppError('Unauthorized', 401);
    }

    const accessRequests = await clientService.getAccessRequests(clientId);
    res.json({ success: true, data: accessRequests });
  } catch (error) {
    console.error('Get access requests error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch access requests'
    });
  }
};

export const approveAccessRequest = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.authenticatedUser?.id;
    
    const propertyId = getParamAsString(req.params.propertyId);
    const institutionId = getParamAsString(req.params.institutionId);
    const { accessType } = req.body;

    if (!clientId) {
      throw new AppError('Unauthorized', 401);
    }

    if (!propertyId || !institutionId) {
      throw new AppError('Property ID and Institution ID are required', 400);
    }

    const result = await clientService.approveAccessRequest(
      clientId,
      propertyId,
      institutionId,
      accessType || 'VIEW_ONLY'
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Approve access error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve access'
    });
  }
};

export const approveAccessRequestById = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.authenticatedUser?.id;
    
    const requestId = getParamAsString(req.params.requestId);
    const { propertyId, institutionId, accessType } = req.body;

    if (!clientId) {
      throw new AppError('Unauthorized', 401);
    }

    if (!requestId) {
      throw new AppError('Request ID is required', 400);
    }

    if (!propertyId || !institutionId) {
      throw new AppError('Property ID and Institution ID are required', 400);
    }

    const result = await clientService.approveAccessRequest(
      clientId,
      propertyId,
      institutionId,
      accessType || 'VIEW_ONLY'
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Approve access error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to approve access'
    });
  }
};

export const revokeAccess = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.authenticatedUser?.id;
    
    const propertyId = getParamAsString(req.params.propertyId);
    const institutionId = getParamAsString(req.params.institutionId);

    if (!clientId) {
      throw new AppError('Unauthorized', 401);
    }

    if (!propertyId || !institutionId) {
      throw new AppError('Property ID and Institution ID are required', 400);
    }

    const result = await clientService.revokeAccess(clientId, propertyId, institutionId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Revoke access error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to revoke access'
    });
  }
};

export const rejectAccessRequest = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.authenticatedUser?.id;
    
    const requestId = getParamAsString(req.params.requestId);

    if (!clientId) {
      throw new AppError('Unauthorized', 401);
    }

    if (!requestId) {
      throw new AppError('Request ID is required', 400);
    }

    const result = await clientService.rejectAccessRequest(clientId, requestId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Reject access error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reject access'
    });
  }
};