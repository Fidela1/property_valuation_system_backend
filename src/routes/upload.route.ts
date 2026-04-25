import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { uploadMultiple, uploadSingle as uploadSingleMiddleware } from '../config/multer';
import {
  uploadPropertyImages,
  getPropertyImages,
  deleteImage,
  setFeaturedImage,
  uploadSingle
} from '../controller/upload.controller';

const router = Router();


// Test route
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Upload route works!' });
});

// All upload routes require authentication and DATA_COLLECTOR role
router.use(authenticate);
router.use(authorize('DATA_COLLECTOR'));

// Upload multiple images for property
router.post(
  '/properties/:propertyId/images',
  uploadMultiple,
  uploadPropertyImages
);

// Get property images
router.get('/properties/:propertyId/images', getPropertyImages);

// Upload single image (profile, etc.)
router.post('/single', uploadSingleMiddleware, uploadSingle);

// Image management
router.delete('/images/:imageId', deleteImage);
router.put('/properties/:propertyId/images/:imageId/featured', setFeaturedImage);

export default router;