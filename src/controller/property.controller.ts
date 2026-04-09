import { Request, Response } from 'express';
import { postPropertyService, 
         getAllPropertiesService,
        getPropertiesByUserIdService,
        deletePropertyByIdService} from '../services/property.service';

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

    const result = await postPropertyService(
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

// src/controllers/property.controller.ts

export async function getAllProperties(req: Request, res: Response) {
  try {
    // ✅ Get query parameters
    const { page, limit, province, district, minPrice, maxPrice } = req.query;
    
    // ✅ Validate pagination parameters
    const pageNum = Math.max(1, page ? Number(page) : 1);  // Minimum 1
    const limitNum = Math.min(100, Math.max(1, limit ? Number(limit) : 10)); // Between 1-100
    
    // ✅ Validate price filters
    const minPriceNum = minPrice ? Number(minPrice) : undefined;
    const maxPriceNum = maxPrice ? Number(maxPrice) : undefined;
    
    if ((minPriceNum && isNaN(minPriceNum)) || (maxPriceNum && isNaN(maxPriceNum))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid price filter. Price must be a number.'
      });
    }
    
    // ✅ Build filters object
    const filters = {
      page: pageNum,
      limit: limitNum,
      province: province as string || undefined,
      district: district as string || undefined,
      minPrice: minPriceNum,
      maxPrice: maxPriceNum
    };
    
    // ✅ Call service
    const result = await getAllPropertiesService(filters);
    
    // ✅ Always return success (even if empty)
    res.status(200).json({
      success: true,
      data: result.properties,
      pagination: result.pagination
    });
    
  } catch (error) {
    console.error('Get all properties error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch properties'
    });
  }
}

export async function getMyProperty(req: Request, res: Response){
  try{
    const userId = req.user?.id;

    if(!userId){
      return res.status(401).json({ error: "Unauthorized"})
    }
    const result = await getPropertiesByUserIdService(userId);

    res.status(200).json({
      success: true,
      result,
    })
  }
  catch(error){
    console.error('Get my properties error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch your properties'
    });
  }
}

export async function deletePropertyById(req: Request, res: Response){
  try{
    const userId = req.user?.id;
    const propertyId = req.params.id as string;
    if(!userId){
      return res.status(401).json({ error: "Unauthorized"})
    }
    if(!propertyId){
      return res.status(401).json({error: "Property ID is required"})
    }
    
    const result = await deletePropertyByIdService(propertyId, userId);

    res.status(200).json({
      success: true,
      message: 'Property deleted successfully'

    })

  } catch(error){
    
   res.status(401).json({
      success: false,
      message: 'Failed to delete property'
    })
}
}