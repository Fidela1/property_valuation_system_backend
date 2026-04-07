import { Request, Response } from 'express';
import { postProperty, getPropertiesByLocation } from '../services/property.service';

export async function createPropertyListing(req: Request, res: Response) {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide property details',
        requiredFields: ['title', 'price', 'province', 'district']
      });
    }

    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const files = req.files as Express.Multer.File[];
    let uploadedImages: string | any[] = [];
    
    if (files && files.length > 0) {
      uploadedImages = files.map((file: any, index: number) => ({
        url: file.path,     
        publicId: file.filename,
        altText: req.body.title || 'Property image',
        order: index,
        fileSize: file.size,
        mimeType: file.mimetype,
      }));
      console.log(` Received ${uploadedImages.length} images with property`);
    }
    
 
    const {
      title,
      description,
      price,
      province,
      district,
      sector,
      cell,
      village,
      street,
      bedrooms,
      bathrooms,
      squareFeet,
      yearBuilt,
      propertyType
    } = req.body;
    

    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!price) missingFields.push('price');
    if (!province) missingFields.push('province');
    if (!district) missingFields.push('district');
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Price must be a valid number greater than 0'
      });
    }

    const result = await postProperty(
      userId,
      {
        title: title.trim(),
        description: description?.trim(),
        price: parsedPrice,
        province: province.trim(),
        district: district.trim(),
        sector: sector?.trim(),
        cell: cell?.trim(),
        village: village?.trim(),
        street: street?.trim(),
        bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
        bathrooms: bathrooms ? parseFloat(bathrooms) : undefined,
        squareFeet: squareFeet ? parseInt(squareFeet) : undefined,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : undefined,
        propertyType: propertyType?.trim(),
        images: uploadedImages 
      },
      req.ip
    );
    
    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        property: result.property,
        upgraded: result.upgraded,
        imagesUploaded: uploadedImages.length
      }
    });
    
  } catch (error: any) {
    console.error('Create property error:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: 'User not found. Please login again.'
      });
    }
    
    if (error.message === 'You need to become a seller before listing properties') {
      return res.status(403).json({
        success: false,
        error: error.message,
        requiresUpgrade: true
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create property. Please try again.',
      message: error.message
    });
  }
}

export async function getProperties(req: Request, res: Response) {
  try {
    const { province, district, sector, minPrice, maxPrice, page, limit } = req.query;
    
    const result = await getPropertiesByLocation({
      province: province as string,
      district: district as string,
      sector: sector as string,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error: any) {
    console.error('Get properties error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch properties'
    });
  }
}