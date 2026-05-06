import prisma from '../config/prisma';
import bcrypt from 'bcrypt';
import { AppError } from '../utils/AppError';
import { randomBytes } from 'crypto';
import { sendEmail, getInvitationEmailTemplate,getRoleUpdateEmailTemplate, getAccountStatusEmailTemplate, getAccountDeletedEmailTemplate } from '../config/email';
type Role = 'ADMIN' | 'DATA_COLLECTOR' | 'SUPERVISOR';

export const countUsers = async () => {
  return await prisma.user.count();
};



export const countEmployees = async () => {
  return await prisma.user.count({
    where: {
      role: {
        in: ['DATA_COLLECTOR', 'SUPERVISOR']
      }
    }
  });
};

export const getRecentActivities = async () => {
  const recentProperties = await prisma.property.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      client: {
        select: { name: true, email: true }
      }
    }
  });
  
  return recentProperties.map(property => ({
    id: property.id,
    type: 'PROPERTY_SUBMITTED',
    description: `New property submitted by ${property.client?.name || 'Unknown'}`,
    upiNumber: property.upiNumber,
    status: property.status,
    createdAt: property.createdAt
  }));
};

const generateInvitationToken = (): string => {
  return randomBytes(32).toString('hex');
};

const generatePlaceholderPassword = (): string => {
  return randomBytes(12).toString('hex');
};

const getRoleDescription = (role: string): string => {
  const descriptionMap: Record<string, string> = {
    'CLIENT': 'You can submit properties for valuation and track their status.',
    'DATA_COLLECTOR': 'You will visit properties, capture GPS coordinates, take photos, and record property features.',
    'SUPERVISOR': 'You will review field data submitted by Data Collectors and approve or request changes.',
    'ADMIN': 'You have full system access to manage users, properties, and all platform settings.'
  };
  return descriptionMap[role] || '';
};

export const createInvitation = async (
  adminId: string,
  data: {
    name: string;
    email: string;
    role: string;
    phone?: string;
  }
) => {

  const normalizedEmail = data.email.toLowerCase().trim();
  
  // Check if email already has an active invitation
  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      email: normalizedEmail,
      status: 'PENDING'
    }
  });
  
  if (existingInvitation) {
    throw new AppError(`An active invitation already exists for ${normalizedEmail}. Please wait for the user to accept or cancel the existing invitation.`, 400);
  }
  
  // Check if user already exists with this email
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });
  
  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
  }
  
  // Check for expired invitation - delete it and allow new
  const existingExpiredInvitation = await prisma.invitation.findFirst({
    where: {
      email: normalizedEmail,
      status: 'EXPIRED'
    }
  });
  
  if (existingExpiredInvitation) {
    // Delete expired invitation instead of blocking
    await prisma.invitation.delete({
      where: { id: existingExpiredInvitation.id }
    });
  }
  
  // Handle cancelled invitations - delete the cancelled one and create new
  const existingCancelledInvitation = await prisma.invitation.findFirst({
    where: {
      email: normalizedEmail,
      status: 'CANCELLED'
    }
  });
  
  if (existingCancelledInvitation) {
    // Delete the cancelled invitation to allow new one
    await prisma.invitation.delete({
      where: { id: existingCancelledInvitation.id }
    });
  }
  
  // Generate invitation token
  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); 
  
  // Create invitation
  const invitation = await prisma.invitation.create({
    data: {
      email: data.email.toLowerCase().trim(),
      name: data.name,
      phone: data.phone,
      role: data.role as any,
      token: token,
      expiresAt: expiresAt,
      status: 'PENDING',
      createdById: adminId
    }
  });
  
  // Generate invitation link
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const invitationLink = `${frontendUrl}/accept-invitation?token=${token}`;
  
  // ✅ SEND EMAIL WITH THE INVITATION LINK
  try {
    // Get role display name for email
    const roleDisplayName = getRoleDisplayName(data.role);
    
    // Send the email
    await sendEmail({
      to: data.email,
      subject: `Invitation to join Property Valuation System as ${roleDisplayName}`,
      html: getInvitationEmailTemplate(data.name, roleDisplayName, invitationLink),
    });
    
    console.log(`✅ Invitation email sent to ${data.email}`);
    
  } catch (emailError) {
    console.error(`❌ Failed to send invitation email to ${data.email}:`, emailError);
    // Don't throw error - invitation is created, just log the failure
    // You might want to notify admin that email failed
  }
  
  return {
    invitation,
    invitationLink,
    token
  };
};

// Helper function for role display names (add if not already in your service)
const getRoleDisplayName = (role: string): string => {
  const roleMap: Record<string, string> = {
    'CLIENT': 'Property Owner',
    'DATA_COLLECTOR': 'Data Collector',
    'SUPERVISOR': 'Supervisor',
    'ADMIN': 'Administrator'
  };
  return roleMap[role] || role;
};
export const getManageUsers = async (
  currentAdminId: string,
  options: {
    page: number;
    limit: number;
    role?: string;
    search?: string;
  }) => {
  const { page, limit, role, search } = options;
  const skip = (page - 1) * limit;
  
  // Build where clause - DON'T exclude current admin
  const where: any = {
    isActive: true
  };
  
  if (role && role !== 'ALL') {
    where.role = role;
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } }
    ];
  }
  
  // Get users with pagination (include all users)
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        addedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where })
  ]);
  
  // Get summary statistics (all users)
  const [
    totalClients,
    totalDataCollectors,
    totalSupervisors,
    totalAdmins,
    activeUsers,
    inactiveUsers,
    totalUsers
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.user.count({ where: { role: 'DATA_COLLECTOR' } }),
    prisma.user.count({ where: { role: 'SUPERVISOR' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.count() // Total users including admins
  ]);
  
  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    totalUsers, // This will now match dashboard count
    totalClients,
    totalDataCollectors,
    totalSupervisors,
    totalAdmins,
    activeUsers,
    inactiveUsers
  };
};

export const updateUserByAdmin = async (
  userId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    isActive?: boolean;
  }
) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  // If email is being changed, check if new email already exists
  let oldEmail = user.email;
  let roleChanged = false;
  let oldRole = user.role;
  let statusChanged = false;
  let oldStatus = user.isActive;
  
  if (data.email && data.email !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() }
    });
    if (existingUser) {
      throw new AppError('Email already exists', 400);
    }
  }
  
  // Check if role is being changed
  if (data.role && data.role !== user.role) {
    roleChanged = true;
  }
  
  // Check if status is being changed
  if (data.isActive !== undefined && data.isActive !== user.isActive) {
    statusChanged = true;
  }
  
  // Build update data
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  
  // Update user
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  });
  
  // Send email notification if role changed
  if (roleChanged && updatedUser.email) {
    try {
      const emailHtml = getRoleUpdateEmailTemplate(
        updatedUser.name || 'User',
        oldRole,
        updatedUser.role
      );
      
      await sendEmail({
        to: updatedUser.email,
        subject: 'Your Role Has Been Updated - Property Valuation System',
        html: emailHtml
      });
      console.log(`Role update email sent to ${updatedUser.email}`);
    } catch (emailError) {
      console.error('Failed to send role update email:', emailError);
    }
  }
  
  // Send email notification if account status changed
  if (statusChanged && updatedUser.email) {
    try {
      const status = data.isActive ? 'activated' : 'deactivated';
      const emailHtml = getAccountStatusEmailTemplate(
        updatedUser.name || 'User',
        status
      );
      
      await sendEmail({
        to: updatedUser.email,
        subject: `Account ${status === 'activated' ? 'Activated' : 'Deactivated'} - Property Valuation System`,
        html: emailHtml
      });
      console.log(`Account ${status} email sent to ${updatedUser.email}`);
    } catch (emailError) {
      console.error('Failed to send account status email:', emailError);
    }
  }
  
  return updatedUser;
};

export const deleteUserByAdmin = async (userId: string, adminId: string) => {
  // First, check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  // Prevent deleting own account
  if (user.id === adminId) {
    throw new AppError('You cannot delete your own account', 400);
  }
  
  // Prevent deleting last admin
  if (user.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      throw new AppError('Cannot delete the last admin user', 400);
    }
  }
  
  // Store user info for email before deletion
  const userEmail = user.email;
  const userName = user.name || 'User';
  
  // Check if user has associated data by counting directly from database
  const [propertiesCount, assignmentsCount, invitationsCount] = await Promise.all([
    prisma.property.count({ where: { clientId: userId } }),
    prisma.assignment.count({ where: { collectorId: userId } }), // ✅ Fixed: Use collectorId instead of userId
    prisma.invitation.count({ where: { createdById: userId } })
  ]);
  
  const hasAssociatedData = propertiesCount > 0 || assignmentsCount > 0 || invitationsCount > 0;
  
  if (hasAssociatedData) {
    // Soft delete - just deactivate instead of hard delete
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    });
    
    // Send deactivation email
    try {
      const emailHtml = getAccountStatusEmailTemplate(userName, 'deactivated');
      await sendEmail({
        to: userEmail,
        subject: 'Account Deactivated - Property Valuation System',
        html: emailHtml
      });
      console.log(`Account deactivation email sent to ${userEmail}`);
    } catch (emailError) {
      console.error('Failed to send deactivation email:', emailError);
    }
    
    return { 
      success: true, 
      softDeleted: true, 
      message: 'User has associated data. Account deactivated instead of deleted.' 
    };
  }
  
  // Send deletion notification email before hard delete
  try {
    const emailHtml = getAccountDeletedEmailTemplate(userName);
    await sendEmail({
      to: userEmail,
      subject: 'Account Deleted - Property Valuation System',
      html: emailHtml
    });
    console.log(`Account deletion email sent to ${userEmail}`);
  } catch (emailError) {
    console.error('Failed to send deletion email:', emailError);
  }
  
  // Hard delete if no associated data
  await prisma.user.delete({
    where: { id: userId }
  });
  
  return { 
    success: true, 
    hardDeleted: true, 
    message: 'User deleted successfully' 
  };
};
// Cancel invitation - allow cancelling COMPLETED invitations if user doesn't exist
export const cancelInvitation = async (invitationId: string, adminId: string) => {
  // Check if invitation exists
  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      NOT: {
        status: 'PENDING'
      }
    }
  });
  
  if (!invitation) {
    throw new AppError('Invitation not found', 404);
  }
  
  // If status is COMPLETED, check if user actually exists
  if (invitation.status === 'COMPLETED') {
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email }
    });
    
    // If user doesn't exist, treat as PENDING and allow cancellation
    if (!existingUser) {
      // Update status to CANCELLED
      const cancelledInvitation = await prisma.invitation.update({
        where: { id: invitationId },
        data: { status: 'CANCELLED' }
      });
      
      return {
        success: true,
        message: 'Invitation cancelled successfully (user never registered)',
        invitation: cancelledInvitation
      };
    }
  }
  
  // Check if current admin created this invitation
  if (invitation.createdById !== adminId) {
    throw new AppError('You can only cancel invitations you created', 403);
  }
  
  // Update status to CANCELLED
  const cancelledInvitation = await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: 'CANCELLED' }
  });
  
  return {
    success: true,
    message: 'Invitation cancelled successfully',
    invitation: cancelledInvitation
  };
};

// Delete invitation - also handle COMPLETED without user
export const deleteInvitation = async (invitationId: string, adminId: string) => {
  // Check if invitation exists
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId }
  });
  
  if (!invitation) {
    throw new AppError('Invitation not found', 404);
  }
  
  // If status is COMPLETED, check if user actually exists
  if (invitation.status === 'COMPLETED') {
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email }
    });
    
    // If user doesn't exist, allow deletion
    if (!existingUser) {
      await prisma.invitation.delete({
        where: { id: invitationId }
      });
      
      return {
        success: true,
        message: 'Invitation deleted successfully (user never registered)',
        deletedInvitation: {
          id: invitation.id,
          email: invitation.email,
          name: invitation.name,
          role: invitation.role
        }
      };
    } else {
      throw new AppError('Cannot delete invitation for user that already exists', 400);
    }
  }
  
  // Only PENDING invitations can be deleted
  if (invitation.status !== 'PENDING') {
    throw new AppError(`Cannot delete invitation that is ${invitation.status.toLowerCase()}`, 400);
  }
  
  // Check if current admin created this invitation
  if (invitation.createdById !== adminId) {
    throw new AppError('You can only delete invitations you created', 403);
  }
  
  // Delete the invitation
  await prisma.invitation.delete({
    where: { id: invitationId }
  });
  
  return {
    success: true,
    message: 'Invitation deleted successfully',
    deletedInvitation: {
      id: invitation.id,
      email: invitation.email,
      name: invitation.name,
      role: invitation.role
    }
  };
};
