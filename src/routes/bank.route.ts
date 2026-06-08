import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as bankController from '../controller/bank.controller';

const router = Router();

// All bank routes require authentication and BANK role
router.use(authenticate);
router.use(authorize('FINACIAL_INSTITUTION'));

// Dashboard
router.get('/dashboard', bankController.getDashboardStats);

// Property Search & Access
router.get('/search', bankController.searchProperty);
router.post('/properties/:propertyId/request-access', bankController.requestAccess);

// Properties
router.get('/properties', bankController.getProperties);
router.get('/properties/:propertyId/tracking', bankController.getPropertyTracking);
router.get('/properties/:propertyId/valuation', bankController.getValuation);
router.get('/properties/:propertyId/report', bankController.downloadReport);

// Access Requests
router.get('/access-requests/pending', bankController.getPendingRequests);

export default router;