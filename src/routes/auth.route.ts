import { Router } from 'express'
import { createUser } from '../controller/auth.controller'

const  router = Router();

router.post('/signup', createUser);

export default router;
