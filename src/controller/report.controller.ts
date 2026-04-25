import { Request, Response } from 'express';
import * as reportService from '../services/report.service';
import { AppError } from '../utils/AppError';

interface AuthRequest extends Request {
  authenticatedUser?: {
    id: string;
    email: string;
    role: string;
  };
}

// Helper: safely extract a single string from req.params
const paramStr = (val: string | string[]): string =>
  Array.isArray(val) ? val[0] : val;

// ============================================
// CREATE REPORT
// ============================================

export const createReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.authenticatedUser?.id;
    const { propertyId, title, content } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (!propertyId || !title) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: propertyId, title'
      });
    }

    const report = await reportService.createReport({
      propertyId,
      title,
      content,
      generatedBy: userId
    });

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: report
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('Create report error:', error);
    res.status(500).json({ success: false, error: 'Failed to create report' });
  }
};

// ============================================
// GET REPORTS BY PROPERTY
// ============================================

export const getReportsByProperty = async (req: Request, res: Response) => {
  try {
    const propertyId = paramStr(req.params.propertyId);

    const reports = await reportService.getReportsByProperty(propertyId);

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('Get reports error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
};

// ============================================
// GET SINGLE REPORT
// ============================================

export const getReportById = async (req: Request, res: Response) => {
  try {
    const reportId = paramStr(req.params.reportId);

    const report = await reportService.getReportById(reportId);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('Get report error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch report' });
  }
};

// ============================================
// UPDATE REPORT
// ============================================

export const updateReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.authenticatedUser?.id;
    const reportId = paramStr(req.params.reportId);
    const { title, content, isPublished } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const report = await reportService.updateReport(reportId, userId, {
      title,
      content,
      isPublished
    });

    res.json({
      success: true,
      message: 'Report updated successfully',
      data: report
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('Update report error:', error);
    res.status(500).json({ success: false, error: 'Failed to update report' });
  }
};

// ============================================
// DELETE REPORT
// ============================================

export const deleteReport = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.authenticatedUser?.id;
    const reportId = paramStr(req.params.reportId);

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    await reportService.deleteReport(reportId, userId);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('Delete report error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete report' });
  }
};

// ============================================
// DOWNLOAD REPORT AS PDF
// ============================================

export const downloadReportPDF = async (req: Request, res: Response) => {
  try {
    const reportId = paramStr(req.params.reportId);

    const pdfBuffer = await reportService.generatePDF(reportId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report_${reportId}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    console.error('Download PDF error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate PDF' });
  }
};