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

router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Upload route works!' });
});

router.use(authenticate);
router.use(authorize('DATA_COLLECTOR'));
router.post(
  '/properties/:propertyId/images',
  uploadMultiple,
  uploadPropertyImages
);

router.get('/properties/:propertyId/images', getPropertyImages);
router.post('/single', uploadSingleMiddleware, uploadSingle);
router.delete('/images/:imageId', deleteImage);
router.put('/properties/:propertyId/images/:imageId/featured', setFeaturedImage);

export default router;