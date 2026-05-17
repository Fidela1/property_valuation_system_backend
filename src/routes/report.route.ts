import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as reportController from '../controller/report.controller';

const router = Router();

router.use(authenticate);

router.post('/', authorize('SUPERVISOR', 'ADMIN'), reportController.createReport);
router.get('/property/:propertyId', reportController.getReportsByProperty);
router.get('/:reportId', reportController.getReportById);
router.put('/:reportId', authorize('SUPERVISOR', 'ADMIN'), reportController.updateReport);
router.delete('/:reportId', authorize('SUPERVISOR', 'ADMIN'), reportController.deleteReport);
router.get('/:reportId/download', reportController.downloadReportPDF);

export default router;