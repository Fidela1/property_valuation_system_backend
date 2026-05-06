import prisma from '../config/prisma';

// ============================================
// USER STATISTICS SUMMARY
// ============================================

export const getUserStatistics = async () => {
  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    verifiedUsers,
    unverifiedUsers
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.count({ where: { isEmailVerified: true } }),
    prisma.user.count({ where: { isEmailVerified: false } })
  ]);
  
  return {
    total: totalUsers,
    active: activeUsers,
    inactive: inactiveUsers,
    verified: verifiedUsers,
    unverified: unverifiedUsers,
    verificationRate: totalUsers > 0 ? ((verifiedUsers / totalUsers) * 100).toFixed(1) : 0
  };
};

// ============================================
// USERS BY ROLE
// ============================================

export const getUsersByRole = async () => {
  const roleCounts = await prisma.user.groupBy({
    by: ['role'],
    _count: {
      role: true
    }
  });
  
  const total = await prisma.user.count();
  
  const roleColors: Record<string, string> = {
    'ADMIN': '#EF4444',
    'SUPERVISOR': '#F59E0B',
    'DATA_COLLECTOR': '#10B981',
    'CLIENT': '#3B82F6'
  };
  
  const roleIcons: Record<string, string> = {
    'ADMIN': '🛡️',
    'SUPERVISOR': '👁️',
    'DATA_COLLECTOR': '📱',
    'CLIENT': '👤'
  };
  
  const roleDescriptions: Record<string, string> = {
    'ADMIN': 'System administrators',
    'SUPERVISOR': 'Review and approve properties',
    'DATA_COLLECTOR': 'Field data collection',
    'CLIENT': 'Property owners'
  };
  
  const data = roleCounts.map(item => ({
    name: item.role,
    value: item._count.role,
    percentage: ((item._count.role / total) * 100).toFixed(1),
    color: roleColors[item.role] || '#6B7280',
    icon: roleIcons[item.role] || '👤',
    description: roleDescriptions[item.role] || ''
  }));
  
  return {
    data,
    total
  };
};

// ============================================
// MONTHLY USER REGISTRATIONS
// ============================================

export const getMonthlyUserRegistrations = async (year?: number) => {
  const targetYear = year || new Date().getFullYear();
  
  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear, 11, 31);
  
  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      createdAt: true,
      role: true
    }
  });
  
  // Initialize monthly data
  const monthlyData = Array(12).fill(0).map((_, i) => ({
    month: new Date(targetYear, i, 1).toLocaleString('default', { month: 'short' }),
    monthNumber: i + 1,
    total: 0,
    clients: 0,
    dataCollectors: 0,
    supervisors: 0,
    admins: 0
  }));
  
  users.forEach(user => {
    const month = new Date(user.createdAt).getMonth();
    monthlyData[month].total++;
    
    if (user.role === 'CLIENT') monthlyData[month].clients++;
    if (user.role === 'DATA_COLLECTOR') monthlyData[month].dataCollectors++;
    if (user.role === 'SUPERVISOR') monthlyData[month].supervisors++;
    if (user.role === 'ADMIN') monthlyData[month].admins++;
  });
  
  const totalForYear = monthlyData.reduce((sum, m) => sum + m.total, 0);
  const averagePerMonth = totalForYear / 12;
  
  return {
    data: monthlyData,
    totalForYear,
    averagePerMonth: Math.round(averagePerMonth),
    year: targetYear
  };
};

// ============================================
// USER REGISTRATIONS BY ROLE (Stacked Bar)
// ============================================

export const getUserRegistrationsByRole = async () => {
  const currentYear = new Date().getFullYear();
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      monthName: date.toLocaleString('default', { month: 'short' })
    };
  }).reverse();
  
  const results = await Promise.all(
    last12Months.map(async ({ year, month, monthName }) => {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const [clients, dataCollectors, supervisors, admins] = await Promise.all([
        prisma.user.count({
          where: {
            role: 'CLIENT',
            createdAt: { gte: startDate, lte: endDate }
          }
        }),
        prisma.user.count({
          where: {
            role: 'DATA_COLLECTOR',
            createdAt: { gte: startDate, lte: endDate }
          }
        }),
        prisma.user.count({
          where: {
            role: 'SUPERVISOR',
            createdAt: { gte: startDate, lte: endDate }
          }
        }),
        prisma.user.count({
          where: {
            role: 'ADMIN',
            createdAt: { gte: startDate, lte: endDate }
          }
        })
      ]);
      
      return {
        month: monthName,
        year,
        clients,
        dataCollectors,
        supervisors,
        admins,
        total: clients + dataCollectors + supervisors + admins
      };
    })
  );
  
  return results;
};

// ============================================
// USER GROWTH TREND (Last 12 Months)
// ============================================

export const getUserGrowthTrend = async () => {
  const today = new Date();
  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    date.setDate(1);
    return date;
  }).reverse();
  
  const results = [];
  let cumulativeTotal = 0;
  
  for (const date of last12Months) {
    const nextMonth = new Date(date);
    nextMonth.setMonth(date.getMonth() + 1);
    
    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: date,
          lt: nextMonth
        }
      }
    });
    
    cumulativeTotal += newUsers;
    
    results.push({
      month: date.toLocaleString('default', { month: 'short' }),
      year: date.getFullYear(),
      newUsers,
      cumulativeTotal,
      monthKey: `${date.getFullYear()}-${date.getMonth()}`
    });
  }
  
  // Calculate growth rate
  const firstMonthTotal = results[0]?.cumulativeTotal || 1;
  const lastMonthTotal = results[results.length - 1]?.cumulativeTotal || 1;
  const growthRate = ((lastMonthTotal - firstMonthTotal) / firstMonthTotal) * 100;
  
  return {
    data: results,
    growthRate: Number(growthRate.toFixed(1)),
    totalUsers: cumulativeTotal
  };
};

// ============================================
// TOP USERS BY ACTIVITY
// ============================================

export const getTopUsersByActivity = async (limit: number = 10) => {
  // Users with most properties
  const topClients = await prisma.user.findMany({
    where: { role: 'CLIENT' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: {
        select: { properties: true }
      },
      createdAt: true
    },
    orderBy: {
      properties: { _count: 'desc' }
    },
    take: limit
  });
  
  // Data collectors with most assignments
  const topDataCollectors = await prisma.user.findMany({
    where: { role: 'DATA_COLLECTOR' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: {
        select: { assignments: true }
      },
      createdAt: true
    },
    orderBy: {
      assignments: { _count: 'desc' }
    },
    take: limit
  });
  
  // Supervisors with most reviews
  const topSupervisors = await prisma.user.findMany({
    where: { role: 'SUPERVISOR' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      _count: {
        select: { reviews: true }
      },
      createdAt: true
    },
    orderBy: {
      reviews: { _count: 'desc' }
    },
    take: limit
  });
  
  return {
    topClients: topClients.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      propertyCount: u._count.properties,
      joined: u.createdAt
    })),
    topDataCollectors: topDataCollectors.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      assignmentCount: u._count.assignments,
      joined: u.createdAt
    })),
    topSupervisors: topSupervisors.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      reviewCount: u._count.reviews,
      joined: u.createdAt
    }))
  };
};

// ============================================
// USER STATUS DISTRIBUTION
// ============================================

export const getUserStatusDistribution = async () => {
  const [active, inactive, verified, unverified] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { isActive: false } }),
    prisma.user.count({ where: { isEmailVerified: true } }),
    prisma.user.count({ where: { isEmailVerified: false } })
  ]);
  
  const total = active + inactive;
  
  return {
    activity: {
      active,
      inactive,
      activePercentage: total > 0 ? ((active / total) * 100).toFixed(1) : 0
    },
    verification: {
      verified,
      unverified,
      verifiedPercentage: total > 0 ? ((verified / total) * 100).toFixed(1) : 0
    }
  };
};

// ============================================
// RECENTLY JOINED USERS
// ============================================

export const getRecentlyJoinedUsers = async (limit: number = 10) => {
  const users = await prisma.user.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      isEmailVerified: true,
      createdAt: true
    }
  });
  
  return users.map(user => ({
    id: user.id,
    name: user.name || 'N/A',
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    joinedAt: user.createdAt,
    joinedDate: user.createdAt.toLocaleDateString()
  }));
};

// ============================================
// USER ENGAGEMENT SUMMARY
// ============================================

export const getUserEngagementSummary = async () => {
  const totalUsers = await prisma.user.count();
  
  // Users who have created at least one property
  const usersWithProperties = await prisma.user.count({
    where: {
      properties: {
        some: {}
      }
    }
  });
  
  // Data collectors who have completed assignments
  const activeDataCollectors = await prisma.user.count({
    where: {
      role: 'DATA_COLLECTOR',
      assignments: {
        some: {
          verifiedAt: { not: null }
        }
      }
    }
  });
  
  // Supervisors who have reviewed properties
  const activeSupervisors = await prisma.user.count({
    where: {
      role: 'SUPERVISOR',
      reviews: {
        some: {}
      }
    }
  });
  
  // Users joined in last 30 days
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  
  const newUsersLast30Days = await prisma.user.count({
    where: {
      createdAt: { gte: last30Days }
    }
  });
  
  return {
    totalUsers,
    usersWithProperties,
    clientEngagementRate: totalUsers > 0 ? ((usersWithProperties / totalUsers) * 100).toFixed(1) : 0,
    activeDataCollectors,
    activeSupervisors,
    newUsersLast30Days,
    newUsersRate: totalUsers > 0 ? ((newUsersLast30Days / totalUsers) * 100).toFixed(1) : 0
  };
};