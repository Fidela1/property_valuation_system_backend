import { Router } from "express";
import authRoute from "./auth.route"
import adminRoute from "./admin.route"
import invitationRoute from "./invitation.route"
import clientRoute from "./client.route"
import supervisorRoute from "./supervisor.route"
import collectorRoute from "./collector.route";

const router = Router();

router.use('/auth', authRoute)
router.use('/admin', adminRoute)
router.use('/invitation', invitationRoute)
router.use('/client', clientRoute)
router.use('/supervisor', supervisorRoute)
router.use('/collector', collectorRoute)
export default router;