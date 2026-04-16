import { Router } from 'express';
import { verifyInvitation, acceptInvitation } from '../controller/invitation.controller';

const router = Router();

router.get('/verify/:token', verifyInvitation);
router.post('/accept', acceptInvitation);

export default router;