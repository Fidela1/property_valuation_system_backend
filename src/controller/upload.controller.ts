import { Request, Response } from 'express';
import * as uploadService from '../services/upload.service';
import { AppError } from '../utils/AppError';

interface AuthRequest extends Request {
  authenticatedUser?: {
    id: string;
    email: string;
    role: string;
  };
}

// Helper function to safely get string from params
const getStringParam = (param: string | string[] | undefined): string => {
  if (!param) return '';
  return Array.isArray(param) ? param[0] : param;
};

// ============================================
// UPLOAD IMAGES FOR PROPERTY (Multiple)
// ============================================

export const uploadPropertyImages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.authenticatedUser?.id;
    const propertyId = getStringParam(req.params.propertyId);
    const files = req.files as Express.Multer.File[];
    
    console.log('📸 Upload request received');
    console.log('User ID:', userId);
    console.log('Property ID:', propertyId);
    console.log('Files count:', files?.length);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: 'Property ID is required'
      });
    }
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images uploaded'
      });
    }
    
    const savedImages = await uploadService.uploadPropertyImages(userId, propertyId, files);
    
    res.status(201).json({
      success: true,
      message: `${savedImages.length} image(s) uploaded successfully`,
      data: {
        images: savedImages,
        count: savedImages.length
      }
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Upload images error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload images'
    });
  }
};

// ============================================
// GET PROPERTY IMAGES
// ============================================

export const getPropertyImages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.authenticatedUser?.id;
    const propertyId = getStringParam(req.params.propertyId);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    if (!propertyId) {
      return res.status(400).json({
        success: false,
        error: 'Property ID is required'
      });
    }
    
    const images = await uploadService.getPropertyImages(userId, propertyId);
    
    res.json({
      success: true,
      data: images
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Get images error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch images'
    });
  }
};

// ============================================
// DELETE IMAGE
// ============================================

export const deleteImage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.authenticatedUser?.id;
    const imageId = getStringParam(req.params.imageId);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    if (!imageId) {
      return res.status(400).json({
        success: false,
        error: 'Image ID is required'
      });
    }
    
    await uploadService.deleteImage(userId, imageId);
    
    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete image'
    });
  }
};

// ============================================
// SET FEATURED IMAGE
// ============================================

export const setFeaturedImage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.authenticatedUser?.id;
    const propertyId = getStringParam(req.params.propertyId);
    const imageId = getStringParam(req.params.imageId);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    if (!propertyId || !imageId) {
      return res.status(400).json({
        success: false,
        error: 'Property ID and Image ID are required'
      });
    }
    
    const featuredImage = await uploadService.setFeaturedImage(userId, propertyId, imageId);
    
    res.json({
      success: true,
      message: 'Featured image updated successfully',
      data: featuredImage
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Set featured image error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set featured image'
    });
  }
};

// ============================================
// UPLOAD SINGLE IMAGE (profile, avatar, etc.)
// ============================================

export const uploadSingle = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.authenticatedUser?.id;
    const file = req.file as Express.Multer.File;
    const { folder } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No image uploaded'
      });
    }
    
    const result = await uploadService.uploadSingleImage(userId, file, folder || 'general');
    
    res.status(201).json({
      success: true,
      message: 'Image uploaded successfully',
      data: result
    });
    
  } catch (error) {
    console.error('Upload single image error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload image'
    });
  }
};