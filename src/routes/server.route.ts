import { Router } from "express";
import authRoute from "./auth.route"
import propertyRoute from "./property.route"

const router = Router();

router.use('/auth', authRoute)
router.use('/property', propertyRoute)

export default router;