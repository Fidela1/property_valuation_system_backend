import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import * as adminController from '../controller/admin.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.post('/dashboard/invitations', adminController.createInvitation);
router.get('/dashboard', adminController.getDashboardStats);
router.get('/dashboard/manage-users', adminController.getManageUsers);
router.put('/dashboard/manage-users/:userId', adminController.updateUserByAdmin);
router.delete('/dashboard/manage-users/:userId', adminController.deleteUserByAdmin);

export default router;