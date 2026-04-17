import { Router } from "express";
import authRoute from "./auth.route"
import adminRoute from "./admin.route"
import invitationRoute from "./invitation.route"

const router = Router();

router.use('/auth', authRoute)
router.use('/admin', adminRoute)
router.use('/invitation', invitationRoute)

export default router;