import { Router } from 'express'
import { createPropertyListing,
         getAllProperties,
         getMyProperty,
         deletePropertyById,} from '../controller/property.controller'
import { authenticate } from '../middleware/auth.middleware'
import { testGeocode } from '../controller/geocoding.controller';
import { uploadMultiple } from '../config/multer';

const  router = Router();

router.post('/addProperty', authenticate, uploadMultiple, createPropertyListing);
router.get('/allProperties', getAllProperties);
router.get('/geocode', testGeocode);
router.get('/myProperties', authenticate, getMyProperty);
router.delete('/deleteProperty/:id', authenticate, deletePropertyById);


export default router;