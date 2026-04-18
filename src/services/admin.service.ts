import prisma from '../config/prisma';
import bcrypt from 'bcrypt';
import { AppError } from '../utils/AppError';
import { randomBytes } from 'crypto';

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

const getRoleDisplayName = (role: string): string => {
  const roleMap: Record<string, string> = {
    'CLIENT': 'Property Owner',
    'DATA_COLLECTOR': 'Data Collector',
    'SUPERVISOR': 'Supervisor',
    'ADMIN': 'Administrator'
  };
  return roleMap[role] || role;
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
      email: data.email.toLowerCase().trim(),
      status: 'PENDING'
    }
  });
  
  if (existingInvitation) {
    throw new AppError(`An active invitation already exists for ${normalizedEmail}. Please wait for the user to accept or cancel the existing invitation.`, 400);
  }
  
  // Check if user already exists with this email
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase().trim() }
  });
  
    const existingExpiredInvitation = await prisma.invitation.findFirst({
    where: {
      email: normalizedEmail,
      status: 'EXPIRED'
    }
  });
  
  if (existingExpiredInvitation) {
    throw new AppError(`An invitation for ${normalizedEmail} has expired. Please ask the user to request a new invitation.`, 400);
  }
  
  // ✅ Check if email has a cancelled invitation
  const existingCancelledInvitation = await prisma.invitation.findFirst({
    where: {
      email: normalizedEmail,
      status: 'CANCELLED'
    }
  });
  
  if (existingCancelledInvitation) {
    throw new AppError(`A previous invitation for ${normalizedEmail} was cancelled. You can send a new invitation.`, 400);
  }

  if (existingUser) {
    throw new AppError('User with this email already exists', 400);
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
  
  return {
    invitation,
    invitationLink,
    token
  };
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
  
  // Build where clause
   const where: any = {
    NOT: { id: currentAdminId },  
  isActive: true   
  };;
  
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
  
  // Get users with pagination
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
  
  // Get summary statistics
  const [
    totalClients,
    totalDataCollectors,
    totalSupervisors,
    totalAdmins,
    activeUsers,
    inactiveUsers
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.user.count({ where: { role: 'DATA_COLLECTOR' } }),
    prisma.user.count({ where: { role: 'SUPERVISOR' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } })
  ]);
  
  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    },
    totalUsers: total,
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
    throw new Error('User not found');
  }
  
  // If email is being changed, check if new email already exists
  if (data.email && data.email !== user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });
    if (existingUser) {
      throw new Error('Email already exists');
    }
  }
  
  // Build update data - only include fields that are provided
  const updateData: any = {};
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.role !== undefined) updateData.role = data.role; // Prisma accepts string for enum
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
  
  return updatedUser;
};

export const deleteUserByAdmin = async (userId: string) => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      properties: true,
      assignments: true
    }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Check if user has any properties or assignments
  if (user.properties.length > 0 || user.assignments.length > 0) {
    // Soft delete - just deactivate instead of hard delete
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false }
    });
    return { softDeleted: true, message: 'User has associated data. Account deactivated instead.' };
  }
  
  // Hard delete if no associated data
  await prisma.user.delete({
    where: { id: userId }
  });
  
  return { hardDeleted: true };
};
