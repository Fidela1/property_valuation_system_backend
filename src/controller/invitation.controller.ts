import { Request, Response } from 'express';
import * as invitationService from '../services/invitation.service';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth.middleware';

export const verifyInvitation = async (req: Request, res: Response) => {
  try {
    const token = String(req.params.token);
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Invitation token is required'
      });
    }
    
    const result = await invitationService.verifyInvitationToken(token) ;
    
    res.json({
      success: true,
      message: 'Invitation is valid',
      data: {
        email: result.email,
        name: result.name,
        role: result.role
      }
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Verify invitation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify invitation'
    });
  }
};


export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const { token, password, phone } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Invitation token is required'
      });
    }
    
    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }
    
    const result = await invitationService.acceptInvitation(token, password, phone);
    
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: result.user,
        token: result.token
      }
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    console.error('Accept invitation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create account'
    });
  }
};

