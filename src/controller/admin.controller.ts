import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../utils/AppError';
import { Prisma } from '@prisma/client';


export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.authenticatedUser?.id;
    
    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const [
      totalUsers,
      totalProperties,
      pendingApplications,
      activeAssignments,
      publishedProperties,
      totalEmployees,
      recentActivities
    ] = await Promise.all([
      adminService.countUsers(),
      adminService.countProperties(),
      adminService.countPropertiesByStatus('PENDING'),
      adminService.countActiveAssignments(),
      adminService.countPropertiesByStatus('PUBLISHED'),
      adminService.countEmployees(),
      adminService.getRecentActivities()
    ]);
    
    return res.status(200).json({
      success: true,
      data: {
        counts: {
          totalUsers,
          totalProperties,
          pendingApplications,
          activeAssignments,
          publishedProperties,
          totalEmployees
        },
        recentActivities
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
};

export const createInvitation = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.authenticatedUser?.id;
    const { name, email, role } = req.body;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Admin access required'
      });
    }

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email, role'
      });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    const validRoles = ['CLIENT', 'DATA_COLLECTOR', 'SUPERVISOR', 'ADMIN'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be CLIENT, DATA_COLLECTOR, SUPERVISOR, or ADMIN'
      });
    }

    const result = await adminService.createInvitation(adminId, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
    });
    
    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        invitation: {
          id: result.invitation.id,
          email: result.invitation.email,
          name: result.invitation.name,
          role: result.invitation.role,
          expiresAt: result.invitation.expiresAt,
          status: result.invitation.status
        },
        invitationLink: result.invitationLink,
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

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(400).json({
          success: false,
          error: 'An invitation with this email already exists'
        });
      }
    }
    }

    res.status(500).json({ 
      success: false, 
      error: 'Failed to create invitation. Please try again.'
    });
  }

export const getManageUsers = async (req: Request, res: Response) => {
  try {
    const adminId = (req as AuthRequest).authenticatedUser?.id;
    const { page, limit, role, search } = req.query;
    
    const result = await adminService.getManageUsers(adminId!, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      role: role as string,
      search: search as string
    });
    
    res.json({
      success: true,
      data: {
        users: result.users,
        pagination: result.pagination,
        summary: {
          totalUsers: result.totalUsers,
          totalClients: result.totalClients,
          totalDataCollectors: result.totalDataCollectors,
          totalSupervisors: result.totalSupervisors,
          totalAdmins: result.totalAdmins,
          activeUsers: result.activeUsers,
          inactiveUsers: result.inactiveUsers
        }
      }
    });
  } catch (error) {
    console.error('Get manage users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

export const updateUserByAdmin = async (req: Request, res: Response) => {
  try {
    const userIdParam = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const userId: string = userIdParam;
    const { name, email, phone, role, isActive } = req.body;
    const adminId = (req as AuthRequest).authenticatedUser?.id;
    
    if (!adminId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (userId === adminId && isActive === false) {
      return res.status(400).json({ 
        success: false, 
        error: 'You cannot deactivate your own account' 
      });
    }
    
    const updatedUser = await adminService.updateUserByAdmin(userId, {
      name,
      email,
      phone,
      role,
      isActive
    });
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message === 'Email already exists') {
      return res.status(409).json({ success: false, error: error.message });
    }
    console.error('Update user by admin error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
};

export const deleteUserByAdmin = async (req: Request, res: Response) => {
  try {
    const userIdParam = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const userId: string = userIdParam;
    const adminId = (req as AuthRequest).authenticatedUser?.id;
    
    if (!adminId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    if (userId === adminId) {
      return res.status(400).json({ 
        success: false, 
        error: 'You cannot delete your own account' 
      });
    }
    
    await adminService.deleteUserByAdmin(userId);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    if (error.message === 'User not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    console.error('Delete user by admin error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
};