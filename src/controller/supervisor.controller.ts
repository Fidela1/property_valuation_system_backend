import { Request, Response } from 'express';
import * as supervisorService from '../services/supervisor.service';
import { AppError } from '../utils/AppError';

interface AuthRequest extends Request {
  authenticatedUser?: {
    id: string;
    email: string;
    role: string;
  };
}

export const getSupervisorStats = async (req: AuthRequest, res: Response) => {
  try {
    const supervisorId = req.authenticatedUser?.id;
    
    if (!supervisorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const stats = await supervisorService.getSupervisorStats(supervisorId);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Get supervisor stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
};

export const getPendingProperties = async (req: AuthRequest, res: Response) => {
  try {
    const supervisorId = req.authenticatedUser?.id;
    
    if (!supervisorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const { page, limit, search } = req.query;
    
    const result = await supervisorService.getPendingProperties({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search: search as string
    });
    
    res.json({
      success: true,
      data: {
        properties: result.properties,
        pagination: result.pagination
      }
    });
    
  } catch (error) {
    console.error('Get pending properties error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending properties'
    });
  }
};

export const getUnderReviewProperties = async (req: AuthRequest, res: Response) => {
  try {
    const supervisorId = req.authenticatedUser?.id;
    
    if (!supervisorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const { page, limit, search } = req.query;
    
    const result = await supervisorService.getUnderReviewProperties({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search: search as string
    });
    
    res.json({
      success: true,
      data: {
        properties: result.properties,
        pagination: result.pagination
      }
    });
    
  } catch (error) {
    console.error('Get under review properties error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch under review properties'
    });
  }
};
export const getAllProperties = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;
    
    const result = await supervisorService.getAllProperties({
      page,
      limit,
      search,
      status
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching all properties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch properties'
    });
  }
};
export const getAvailableDataCollectors = async (req: AuthRequest, res: Response) => {
  try {
    const supervisorId = req.authenticatedUser?.id;
    
    if (!supervisorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const collectors = await supervisorService.getAvailableDataCollectors();
    
    res.json({
      success: true,
      data: collectors
    });
    
  } catch (error) {
    console.error('Get data collectors error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch data collectors'
    });
  }
};

export const assignDataCollector = async (req: AuthRequest, res: Response) => {
  try {
    const supervisorId = req.authenticatedUser?.id;
    let { id } = req.params;
    const { collectorId, notes } = req.body;
    
    if (!supervisorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    if (!collectorId) {
      return res.status(400).json({
        success: false,
        error: 'Collector ID is required'
      });
    }
    
     if (Array.isArray(id)) {
      id = id[0];
    }
    const result = await supervisorService.assignDataCollector(id, collectorId, supervisorId, notes);
    
    res.json({
      success: true,
      message: 'Data collector assigned successfully',
      data: result
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Assign data collector error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign data collector'
    });
  }
};

export const getPropertyForReview = async (req: AuthRequest, res: Response) => {
  try {
    const supervisorId = req.authenticatedUser?.id;
    let { id } = req.params;
    
     if (Array.isArray(id)) {
      id = id[0];
    }
    if (!supervisorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const property = await supervisorService.getPropertyForReview(id);
    
    res.json({
      success: true,
      data: property
    });
    
  } catch (error) {
    if (error instanceof AppError && error.message === 'Property not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Get property for review error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch property details'
    });
  }
};

export const approveProperty = async (req: AuthRequest, res: Response) => {
  try {
    const supervisorId = req.authenticatedUser?.id;
    let { id } = req.params;
    const { comment } = req.body;
    
    if (!supervisorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
     if (Array.isArray(id)) {
      id = id[0];
    }
    const result = await supervisorService.approveProperty(id, supervisorId, comment || 'Approved');
    
    res.json({
      success: true,
      message: 'Property approved successfully',
      data: result
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Approve property error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve property'
    });
  }
};

export const rejectProperty = async (req: AuthRequest, res: Response) => {
  try {
    const supervisorId = req.authenticatedUser?.id;
    let { id } = req.params;
    const { comment } = req.body;
    
    if (!supervisorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
     if (Array.isArray(id)) {
      id = id[0];
    }

    if (!comment) {
      return res.status(400).json({
        success: false,
        error: 'Comment is required for rejection'
      });
    }
    
    const result = await supervisorService.rejectProperty(id, supervisorId, comment);
    
    res.json({
      success: true,
      message: 'Property rejected. Data collector needs to revise.',
      data: result
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Reject property error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject property'
    });
  }
};

export const publishProperty = async (req: AuthRequest, res: Response) => {
  try {
    const supervisorId = req.authenticatedUser?.id;
    let { id } = req.params;
    
    if (!supervisorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

     if (Array.isArray(id)) {
      id = id[0];
    }
    
    const property = await supervisorService.publishProperty(id, supervisorId);
    
    res.json({
      success: true,
      message: 'Property published successfully',
      data: property
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Publish property error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to publish property'
    });
  }
};

export const getInFieldworkProperties = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    
    const result = await supervisorService.getInFieldworkProperties({
      page,
      limit,
      search
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching in-fieldwork properties:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch in-fieldwork properties'
    });
  }
};