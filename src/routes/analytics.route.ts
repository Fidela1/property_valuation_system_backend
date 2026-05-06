import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as userAnalyticsController from '../controller/analytics.controller';

const router = Router();

// All user analytics routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// Summary & Statistics
router.get('/statistics', userAnalyticsController.getUserStatistics);
router.get('/engagement', userAnalyticsController.getUserEngagementSummary);

// Distribution Charts
router.get('/by-role', userAnalyticsController.getUsersByRole);
router.get('/status-distribution', userAnalyticsController.getUserStatusDistribution);

// Trend Charts
router.get('/monthly-registrations', userAnalyticsController.getMonthlyUserRegistrations);
router.get('/growth-trend', userAnalyticsController.getUserGrowthTrend);
router.get('/registrations-by-role', userAnalyticsController.getUserRegistrationsByRole);

// User Lists
router.get('/top-active', userAnalyticsController.getTopUsersByActivity);
router.get('/recent-joined', userAnalyticsController.getRecentlyJoinedUsers);

export default router;