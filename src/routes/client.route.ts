import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createProperty,
  getMyProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getPropertyTimeline,
  getAccessRequests,
   approveAccessRequestById,
   rejectAccessRequest
} from '../controller/client.controller';

const router = Router();

router.use(authenticate);

router.post('/createProperty', createProperty);                    
router.get('/myProperties', getMyProperties);                    
router.get('/myProperties/:id', getPropertyById);                 
router.get('/myProperties/:id/timeline', getPropertyTimeline);    
router.put('/myProperties/:id', updateProperty);                  
router.delete('/myProperties/:id', deleteProperty);       
// In client.routes.ts
router.get('/access-requests', getAccessRequests);
router.post('/access-requests/:requestId/approve', approveAccessRequestById);
router.delete('/access-requests/:requestId/reject', rejectAccessRequest);        

export default router;