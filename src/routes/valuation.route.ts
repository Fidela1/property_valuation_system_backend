import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as valuationController from '../controller/valuation.controller';

const router = Router();

router.post('/live', valuationController.liveValuation);

router.post('/preview', valuationController.previewValuation);

router.get('/property/:propertyId', authenticate, valuationController.getValuation);
router.post(
  '/property/:propertyId/save',
  authenticate,
  authorize('SUPERVISOR', 'ADMIN'),
  valuationController.saveValuation
);

export default router;