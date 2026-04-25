import prisma from '../config/prisma';
import { AppError } from '../utils/AppError';
import fs from 'fs';
import path from 'path';

export const uploadPropertyImages = async (
  userId: string,
  propertyId: string,
  files: Express.Multer.File[]
) => {
  console.log('🔵 uploadPropertyImages called');
  console.log('userId:', userId);
  console.log('propertyId:', propertyId);
  console.log('files count:', files?.length);

  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      assignment: {
        collectorId: userId
      },
      status: 'IN_FIELDWORK'
    }
  });

  console.log('Property found:', !!property);

  if (!property) {
    throw new AppError('Property not found or not in fieldwork status', 404);
  }

  const existingImages = await prisma.image.findMany({
    where: { propertyId },
    orderBy: { order: 'desc' },
    take: 1
  });

  let nextOrder = existingImages.length > 0 ? existingImages[0].order + 1 : 0;

  const savedImages = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const imageUrl = `/uploads/properties/${file.filename}`;
    
    const image = await prisma.image.create({
      data: {
        propertyId,
        url: imageUrl,
        publicId: file.filename,
        order: nextOrder++,
        isFeatured: i === 0 && nextOrder === 1,
        uploadedBy: userId,
        fileSize: file.size,
        mimeType: file.mimetype
      }
    });
    savedImages.push(image);
  }

  console.log('Saved images:', savedImages.length);

  return savedImages;
};

export const getPropertyImages = async (userId: string, propertyId: string) => {
  // Verify property belongs to collector
  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      assignment: {
        collectorId: userId
      }
    }
  });

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  const images = await prisma.image.findMany({
    where: { propertyId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      url: true,
      altText: true,
      isFeatured: true,
      order: true,
      fileSize: true,
      mimeType: true
    }
  });

  return images;
};

export const deleteImage = async (userId: string, imageId: string) => {
  const image = await prisma.image.findFirst({
    where: {
      id: imageId,
      uploadedBy: userId
    },
    include: {
      property: true
    }
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  const filePath = path.join(__dirname, '../../uploads/properties', path.basename(image.url));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await prisma.image.delete({
    where: { id: imageId }
  });

  if (image.isFeatured) {
    const nextImage = await prisma.image.findFirst({
      where: { propertyId: image.propertyId },
      orderBy: { order: 'asc' }
    });

    if (nextImage) {
      await prisma.image.update({
        where: { id: nextImage.id },
        data: { isFeatured: true }
      });
    }
  }

  return { success: true };
};

export const setFeaturedImage = async (userId: string, propertyId: string, imageId: string) => {

  const property = await prisma.property.findFirst({
    where: {
      id: propertyId,
      assignment: {
        collectorId: userId
      }
    }
  });

  if (!property) {
    throw new AppError('Property not found', 404);
  }

  const image = await prisma.image.findFirst({
    where: {
      id: imageId,
      propertyId
    }
  });

  if (!image) {
    throw new AppError('Image not found', 404);
  }

  await prisma.image.updateMany({
    where: { propertyId },
    data: { isFeatured: false }
  });

  const featuredImage = await prisma.image.update({
    where: { id: imageId },
    data: { isFeatured: true }
  });

  return featuredImage;
};

export const uploadSingleImage = async (userId: string, file: Express.Multer.File, folder: string = 'general') => {
  // Create folder if doesn't exist
  const uploadDir = `uploads/${folder}`;
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const imageUrl = `/${uploadDir}/${file.filename}`;

  return {
    url: imageUrl,
    publicId: file.filename,
    size: file.size,
    mimeType: file.mimetype,
    originalName: file.originalname
  };
};