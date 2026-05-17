import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as collectorController from '../controller/collector.contoller';

const router = Router();

router.use(authenticate);
router.use(authorize('DATA_COLLECTOR'));

router.get('/dashboard', collectorController.getCollectorStats);
router.get('/dashboard/assignments', collectorController.getAssignedProperties);
router.get('/dashboard/assignments/:id', collectorController.getAssignmentById);
router.post('/dashboard/assignments/:id/accept', collectorController.acceptAssignment);
router.post('/dashboard/field-data', collectorController.submitFieldData);
router.get('/dashboard/field-data/:id', collectorController.getFieldDataById);
router.put('/dashboard/field-data/:id', collectorController.updateFieldData);
router.get('/dashboard/submissions', collectorController.getSubmissionHistory);
router.get('/dashboard/revisions', collectorController.getRevisionRequests);

export default router;