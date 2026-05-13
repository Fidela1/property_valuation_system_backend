import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as userAnalyticsController from '../controller/analytics.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/statistics', userAnalyticsController.getUserStatistics);
router.get('/engagement', userAnalyticsController.getUserEngagementSummary);
router.get('/by-role', userAnalyticsController.getUsersByRole);
router.get('/status-distribution', userAnalyticsController.getUserStatusDistribution);
router.get('/monthly-registrations', userAnalyticsController.getMonthlyUserRegistrations);
router.get('/growth-trend', userAnalyticsController.getUserGrowthTrend);
router.get('/registrations-by-role', userAnalyticsController.getUserRegistrationsByRole);
router.get('/top-active', userAnalyticsController.getTopUsersByActivity);
router.get('/recent-joined', userAnalyticsController.getRecentlyJoinedUsers);

export default router;