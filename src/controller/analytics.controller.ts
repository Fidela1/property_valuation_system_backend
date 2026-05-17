import { Request, Response } from 'express';
import * as userAnalyticsService from '../services/analytics.service';
import { AppError } from '../utils/AppError';


export const getUserStatistics = async (req: Request, res: Response) => {
  try {
    const stats = await userAnalyticsService.getUserStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Get user statistics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user statistics' });
  }
};

export const getUsersByRole = async (req: Request, res: Response) => {
  try {
    const data = await userAnalyticsService.getUsersByRole();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users by role' });
  }
};

export const getMonthlyUserRegistrations = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    const data = await userAnalyticsService.getMonthlyUserRegistrations(year ? Number(year) : undefined);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get monthly registrations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch monthly registrations' });
  }
};

export const getUserGrowthTrend = async (req: Request, res: Response) => {
  try {
    const data = await userAnalyticsService.getUserGrowthTrend();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get user growth trend error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user growth trend' });
  }
};

export const getUserRegistrationsByRole = async (req: Request, res: Response) => {
  try {
    const data = await userAnalyticsService.getUserRegistrationsByRole();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get registrations by role error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch registrations by role' });
  }
};

export const getUserStatusDistribution = async (req: Request, res: Response) => {
  try {
    const data = await userAnalyticsService.getUserStatusDistribution();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get user status distribution error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user status distribution' });
  }
};

export const getTopUsersByActivity = async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const data = await userAnalyticsService.getTopUsersByActivity(limit ? Number(limit) : 10);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get top users by activity error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch top users' });
  }
};

export const getRecentlyJoinedUsers = async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const data = await userAnalyticsService.getRecentlyJoinedUsers(limit ? Number(limit) : 10);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get recently joined users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch recent users' });
  }
};

export const getUserEngagementSummary = async (req: Request, res: Response) => {
  try {
    const data = await userAnalyticsService.getUserEngagementSummary();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Get user engagement summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user engagement' });
  }
};