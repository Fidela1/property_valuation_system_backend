import { Router } from "express";
import authRoute from "./auth.route"
import adminRoute from "./admin.route"
import invitationRoute from "./invitation.route"
import clientRoute from "./client.route"
import supervisorRoute from "./supervisor.route"
import collectorRoute from "./collector.route";
import uploadRoute from "./upload.route";
import valuationRoute from "./valuation.route"
import reportRoute from "./report.route"
import userAnalyticsRoute from "./analytics.route";
import propertyRoutes from "./property.route";

const router = Router();

router.use('/auth', authRoute)
router.use('/admin', adminRoute)
router.use('/invitation', invitationRoute)
router.use('/client', clientRoute)
router.use('/supervisor', supervisorRoute)
router.use('/collector', collectorRoute)
router.use('/upload', uploadRoute);
router.use('/valuation', valuationRoute);
router.use('/report', reportRoute);
router.use('/user-analytics', userAnalyticsRoute);
router.use('/properties', propertyRoutes);
export default router;