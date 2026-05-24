import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as reportService from '../services/report.service';
import { AppError } from '../utils/AppError';

export const getPropertiesForReport = async (req: AuthRequest, res: Response) => {
  try {
    const supervisorId = req.authenticatedUser?.id;
    
    if (!supervisorId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const properties = await reportService.getPropertiesForReport(supervisorId);
    
    res.json({
      success: true,
      data: properties
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch properties' });
  }
};

export const uploadReport = async (req: AuthRequest, res: Response) => {
  try {
    const supervisorId = req.authenticatedUser?.id;
    const { propertyId, title } = req.body;
    const file = req.file;
    
    if (!supervisorId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    if (!propertyId) {
      return res.status(400).json({ success: false, error: 'Property ID is required' });
    }
    
    if (!file) {
      return res.status(400).json({ success: false, error: 'Report file is required' });
    }
    
    const report = await reportService.uploadReport(supervisorId, propertyId, file, title);
    
    res.json({
      success: true,
      message: 'Report uploaded successfully',
      data: report
    });
  } catch (error: any) {
    console.error('Error uploading report:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getReports = async (req: AuthRequest, res: Response) => {
  try {
    const supervisorId = req.authenticatedUser?.id;
    
    if (!supervisorId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const reports = await reportService.getReportsBySupervisor(supervisorId);
    
    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
};

// ============ CONTROLLER FUNCTIONS FOR CLIENTS ============

// Get reports by property ID (for clients to view their property reports)
export const getReportsByProperty = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.authenticatedUser?.id;
    const userRole = req.authenticatedUser?.role;
    const { propertyId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    // Ensure propertyId is a string (not array)
    const propertyIdStr = Array.isArray(propertyId) ? propertyId[0] : propertyId;
    
    if (!propertyIdStr) {
      return res.status(400).json({ success: false, error: 'Property ID is required' });
    }
    
    const reports = await reportService.getReportsByProperty(propertyIdStr, userId, userRole || 'CLIENT');
    
    res.json({
      success: true,
      data: reports
    });
  } catch (error: any) {
    console.error('Error fetching property reports:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get single report by ID (for clients to view specific report)
export const getReportById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.authenticatedUser?.id;
    const userRole = req.authenticatedUser?.role;
    const { reportId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    // Ensure reportId is a string (not array)
    const reportIdStr = Array.isArray(reportId) ? reportId[0] : reportId;
    
    if (!reportIdStr) {
      return res.status(400).json({ success: false, error: 'Report ID is required' });
    }
    
    const report = await reportService.getReportById(reportIdStr, userId, userRole || 'CLIENT');
    
    res.json({
      success: true,
      data: report
    });
  } catch (error: any) {
    console.error('Error fetching report:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// Download report PDF (for clients to download their reports)
export const downloadReportPDF = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.authenticatedUser?.id;
    const userRole = req.authenticatedUser?.role;
    const { reportId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    // Ensure reportId is a string (not array)
    const reportIdStr = Array.isArray(reportId) ? reportId[0] : reportId;
    
    if (!reportIdStr) {
      return res.status(400).json({ success: false, error: 'Report ID is required' });
    }
    
    const { buffer, filename, mimeType } = await reportService.downloadReport(reportIdStr, userId, userRole || 'CLIENT');
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error: any) {
    console.error('Error downloading report:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// Get all reports for client (their properties' reports)
export const getClientReports = async (req: AuthRequest, res: Response) => {
  try {
    const clientId = req.authenticatedUser?.id;
    
    if (!clientId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    const reports = await reportService.getClientReports(clientId);
    
    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching client reports:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
};

export const deleteReport = async (req: AuthRequest, res: Response) => {
  try {
    const supervisorId = req.authenticatedUser?.id;
    let { id } = req.params;
    
    if (Array.isArray(id)) {
      id = id[0];
    }
    
    if (!supervisorId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    
    await reportService.deleteReport(id, supervisorId);
    
    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting report:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};