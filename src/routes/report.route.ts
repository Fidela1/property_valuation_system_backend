import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as reportController from '../controller/report.controller';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage()
});

router.use(authenticate);

router.get(
  '/property/:propertyId',
  reportController.getReportsByProperty
);

router.get(
  '/client/reports',
  reportController.getClientReports
);

router.get(
  '/:reportId/pdf',
  reportController.downloadReportPDF
);

// Get single report
router.get(
  '/:reportId',
  reportController.getReportById
);

// ======================================================
// SUPERVISOR / ADMIN ROUTES
// ======================================================

// Get properties for report dropdown
router.get(
  '/properties',
  authorize('SUPERVISOR', 'ADMIN'),
  reportController.getPropertiesForReport
);

// Upload report
router.post(
  '/upload',
  authorize('SUPERVISOR', 'ADMIN'),
  upload.single('report'),
  reportController.uploadReport
);

// Get all reports created by supervisor
router.get(
  '/',
  authorize('SUPERVISOR', 'ADMIN'),
  reportController.getReports
);

// Delete report
router.delete(
  '/:id',
  authorize('SUPERVISOR', 'ADMIN'),
  reportController.deleteReport
);

export default router;