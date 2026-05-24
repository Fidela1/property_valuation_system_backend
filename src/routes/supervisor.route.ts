import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as supervisorController from '../controller/supervisor.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('SUPERVISOR'));

router.get('/dashboard', supervisorController.getSupervisorStats);
router.get('/dashboard/properties/all', supervisorController.getAllProperties);
router.get('/dashboard/properties/pending', supervisorController.getPendingProperties);
router.get('/dashboard/properties/under-review', supervisorController.getUnderReviewProperties);
router.get('/dashboard/properties/in-fieldwork', supervisorController.getInFieldworkProperties);
router.get('/dashboard/properties/:id', supervisorController.getPropertyForReview);
router.get('/dashboard/data-collectors', supervisorController.getAvailableDataCollectors);
router.post('/dashboard/properties/:id/assign', supervisorController.assignDataCollector);
router.post('/dashboard/properties/:id/approve', supervisorController.approveProperty);
router.post('/dashboard/properties/:id/reject', supervisorController.rejectProperty);
router.post('/dashboard/properties/:id/publish', supervisorController.publishProperty);
router.get('/dashboard/properties/report-dropdown', supervisorController.getPropertiesForReportDropdown);

export default router;