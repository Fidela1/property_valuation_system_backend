import { Router } from 'express'
import { createPropertyListing, getProperties } from '../controller/property.controller'
import { authenticate } from '../middleware/auth.middleware'
import { testGeocode } from '../controller/geocoding.controller';
import { uploadMultiple } from '../config/multer';

const  router = Router();

router.post('/addProperty', authenticate, uploadMultiple, createPropertyListing);
router.get('/properties', getProperties);
router.get('/geocode', testGeocode);


export default router;