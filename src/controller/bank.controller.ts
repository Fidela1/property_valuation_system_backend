import { Request, Response } from 'express';
import * as bankService from '../services/bank.service';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/prisma';

// Helper function to safely get string parameter
const getParamAsString = (param: string | string[] | undefined): string => {
  if (!param) return '';
  return Array.isArray(param) ? param[0] : param;
};

// Dashboard - Get bank's dashboard stats
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const bankId = req.authenticatedUser?.id;
    if (!bankId) {
      throw new AppError('Unauthorized', 401);
    }

    const stats = await bankService.getBankDashboardStats(bankId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get bank dashboard stats error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats'
    });
  }
};

// Search for property by UPI
export const searchProperty = async (req: AuthRequest, res: Response) => {
  try {
    const bankId = req.authenticatedUser?.id;
    const { upiNumber } = req.query;

    if (!bankId) {
      throw new AppError('Unauthorized', 401);
    }

    if (!upiNumber || typeof upiNumber !== 'string') {
      throw new AppError('UPI number is required', 400);
    }

    const result = await bankService.searchProperty(bankId, upiNumber);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Search property error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search property'
    });
  }
};

// Request access to a property
export const requestAccess = async (req: AuthRequest, res: Response) => {
  try {
    const bankId = req.authenticatedUser?.id;
    // Fix: Convert propertyId to string
    const propertyId = getParamAsString(req.params.propertyId);
    const { accessType, message } = req.body;

    if (!bankId) {
      throw new AppError('Unauthorized', 401);
    }

    if (!propertyId) {
      throw new AppError('Property ID is required', 400);
    }

    const result = await bankService.requestPropertyAccess(
      bankId,
      propertyId,
      accessType || 'TRACK_PROGRESS',
      message
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Request access error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to request access'
    });
  }
};

// Get property tracking progress
export const getPropertyTracking = async (req: AuthRequest, res: Response) => {
  try {
    const bankId = req.authenticatedUser?.id;
    // Fix: Convert propertyId to string
    const propertyId = getParamAsString(req.params.propertyId);

    if (!bankId) {
      throw new AppError('Unauthorized', 401);
    }

    if (!propertyId) {
      throw new AppError('Property ID is required', 400);
    }

    const tracking = await bankService.getPropertyTracking(bankId, propertyId);
    res.json({ success: true, data: tracking });
  } catch (error) {
    console.error('Get property tracking error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch tracking details'
    });
  }
};

// Get final valuation for approved/published property
export const getValuation = async (req: AuthRequest, res: Response) => {
  try {
    const bankId = req.authenticatedUser?.id;
    // Fix: Convert propertyId to string
    const propertyId = getParamAsString(req.params.propertyId);

    if (!bankId) {
      throw new AppError('Unauthorized', 401);
    }

    if (!propertyId) {
      throw new AppError('Property ID is required', 400);
    }

    const valuation = await bankService.getPropertyValuation(bankId, propertyId);
    res.json({ success: true, data: valuation });
  } catch (error) {
    console.error('Get valuation error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch valuation'
    });
  }
};

// Download valuation report
export const downloadReport = async (req: AuthRequest, res: Response) => {
  try {
    const bankId = req.authenticatedUser?.id;
    // Fix: Convert propertyId to string
    const propertyId = getParamAsString(req.params.propertyId);

    if (!bankId) {
      throw new AppError('Unauthorized', 401);
    }

    if (!propertyId) {
      throw new AppError('Property ID is required', 400);
    }

    const report = await bankService.getPropertyValuation(bankId, propertyId);
    
    // Return as JSON (can be extended to generate PDF)
    res.json({
      success: true,
      data: report,
      message: 'Report generated successfully'
    });
  } catch (error) {
    console.error('Download report error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate report'
    });
  }
};

// Get all properties bank has access to
export const getProperties = async (req: AuthRequest, res: Response) => {
  try {
    const bankId = req.authenticatedUser?.id;
    if (!bankId) {
      throw new AppError('Unauthorized', 401);
    }

    const { page, limit, status, search } = req.query;
    const result = await bankService.getBankProperties(bankId, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      status: status as string,
      search: search as string
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get bank properties error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch properties'
    });
  }
};

// Get pending access requests for bank
export const getPendingRequests = async (req: AuthRequest, res: Response) => {
  try {
    const bankId = req.authenticatedUser?.id;
    if (!bankId) {
      throw new AppError('Unauthorized', 401);
    }

    const pendingRequests = await bankService.getPendingAccessRequests(bankId);
    res.json({ success: true, data: pendingRequests });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch pending requests'
    });
  }
};

// Get bank profile/info
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const bankId = req.authenticatedUser?.id;
    if (!bankId) {
      throw new AppError('Unauthorized', 401);
    }

    const bank = await prisma.user.findUnique({
      where: { id: bankId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        isActive: true
      }
    });

    if (!bank) {
      throw new AppError('Bank not found', 404);
    }

    res.json({ success: true, data: bank });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(error instanceof AppError ? error.statusCode : 500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch profile'
    });
  }
};

