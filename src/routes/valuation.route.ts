import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as valuationController from '../controller/valuation.controller';

const router = Router();

// Public routes (no authentication required)
router.post('/live', valuationController.getValuation);
router.post('/property/:propertyId', valuationController.getPropertyValuation);
router.post('/compare', valuationController.compareValuations);

// Protected routes - wrap the controller function to avoid type issues
router.post(
  '/property/:propertyId/save',
  authenticate,
  authorize('SUPERVISOR', 'ADMIN'),
  (req, res, next) => {
    valuationController.saveValuation(req, res).catch(next);
  }
);

export default router;