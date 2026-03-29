import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.services'

 export const createUser = async (req: Request, res: Response, next: NextFunction) => {

    try {
        const {name, email, phone, password} = req.body;
        
    const user = await authService.createUser(name, email, phone, password);

    return res.status(201).json({
        success: true,
        message: "User created successfully",
        data: user
        })
    } catch (err) {
      next(err)
    }

   
    
 }


