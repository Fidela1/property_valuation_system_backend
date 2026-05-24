// routes/property.routes.ts
import { Router } from 'express';
import * as propertyController from '../controller/property.controller';

const router = Router();

// Public routes - NO authentication required
router.get('/published', propertyController.getPublishedProperties);
router.get('/published/:id', propertyController.getPublishedPropertyById);

export default router;