import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/prisma'; 
import { AppError } from '../utils/AppError';


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
  if (error instanceof Error && error.message.includes('Unique constraint')) {
    return res.status(400).json({
      success: false,
      error: 'An invitation with this email already exists'
    });
  }
}
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
    
    await adminService.deleteUserByAdmin(userId, adminId);
    
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

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.authenticatedUser?.id;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const [
      totalUsers,
      totalProperties,
      pendingApplications,
      activeAssignments,
      underReview,
      publishedProperties,
      totalEmployees
    ] = await Promise.all([
      prisma.user.count(),
      prisma.property.count(),
      prisma.property.count({ where: { status: 'PENDING' } }),
      prisma.property.count({ where: { status: { in: ['ASSIGNED', 'IN_FIELDWORK'] } } }),
      prisma.property.count({ where: { status: 'UNDER_REVIEW' } }),
      prisma.property.count({ where: { status: 'PUBLISHED' } }),
      prisma.user.count({ where: { role: { in: ['DATA_COLLECTOR', 'SUPERVISOR'] } } })
    ]);
    
    res.json({
      success: true,
      data: {
        counts: {
          totalUsers,
          totalProperties,
          pendingApplications,
          activeAssignments,
          underReview,
          publishedProperties,
          totalEmployees
        }
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export const getRecentActivities = async (req: Request, res: Response) => {
  try {
    const recentProperties = await prisma.property.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { name: true, email: true }
        }
      }
    });
    
    const activities = recentProperties.map((property: any) => ({
      id: property.id,
      type: 'PROPERTY_SUBMITTED',
      description: `${property.client?.name || 'A client'} submitted property ${property.upiNumber}`,
      upiNumber: property.upiNumber,
      status: property.status,
      createdAt: property.createdAt
    }));
    
    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

const getParamAsString = (param: string | string[] | undefined): string => {
  if (!param) return '';
  return Array.isArray(param) ? param[0] : param;
};

export const cancelInvitation = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.authenticatedUser?.id;
    const invitationId = getParamAsString(req.params.invitationId);
    
    if (!adminId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: Admin access required' 
      });
    }
    
    if (!invitationId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invitation ID is required' 
      });
    }
    
    const result = await adminService.cancelInvitation(invitationId, adminId);
    
    res.json({
      success: true,
      message: result.message,
      data: result.invitation
    });
    
  } catch (error: any) {
    if (error.message === 'Invitation not found or already processed') {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message === 'You can only cancel invitations you created') {
      return res.status(403).json({ success: false, error: error.message });
    }
    
    console.error('Cancel invitation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to cancel invitation' 
    });
  }
};

export const deleteInvitation = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.authenticatedUser?.id;
    const invitationId = getParamAsString(req.params.invitationId);
    
    if (!adminId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: Admin access required' 
      });
    }
    
    const result = await adminService.deleteInvitation(invitationId, adminId);
    
    res.json({
      success: true,
      message: result.message,
      data: result.deletedInvitation
    });
    
  } catch (error: any) {
    if (error.message === 'Invitation not found') {
      return res.status(404).json({ success: false, error: error.message });
    }
    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    if (error.message === 'You can only delete invitations you created') {
      return res.status(403).json({ success: false, error: error.message });
    }
    
    console.error('Delete invitation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete invitation' 
    });
  }
};

// In your toggle user status API route
export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userIdParam = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const userId: string = userIdParam;
    const adminId = req.authenticatedUser?.id;
    
    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    const result = await adminService.toggleUserStatus(userId, adminId);
    
    res.json({
      success: true,
      message: result.message,
      data: result.user
    });
    
  } catch (error: any) {
    console.error('Toggle user status error:', error);
    
    if (error.message === 'You cannot deactivate your own account') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update user status'
    });
  }
};