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

router.use(authenticate);

router.post('/createProperty', createProperty);                    
router.get('/myProperties', getMyProperties);                    
router.get('/myProperties/:id', getPropertyById);                 
router.get('/myProperties/:id/timeline', getPropertyTimeline);    
router.put('/myProperties/:id', updateProperty);                  
router.delete('/myProperties/:id', deleteProperty);               

export default router;