import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createProperty,
  getMyProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getPropertyTimeline
} from '../controller/client.controller';

const router = Router();

// All property routes require authentication
router.use(authenticate);

// Client property routes (Full CRUD)
router.post('/createProperty', createProperty);                    // Create
router.get('/myProperties', getMyProperties);                    // Read all (dashboard)
router.get('/myProperties/:id', getPropertyById);                 // Read one
router.get('/myProperties/:id/timeline', getPropertyTimeline);    // Timeline
router.put('/myProperties/:id', updateProperty);                  // Update
router.delete('/myProperties/:id', deleteProperty);               // Delete

export default router;