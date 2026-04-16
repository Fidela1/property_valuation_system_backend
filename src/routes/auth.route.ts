import { Router } from 'express'
import passport from 'passport';
import { createUser, login
, googleAuth, googleAuthCallback
 } from '../controller/auth.controller'

const  router = Router();

router.post('/signup', createUser);
router.post('/login', login);
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {

    const user = req.user;
    res.json({ 
      success: true, 
      message: 'Google login successful',
      user 
    });
  }
);
export default router;
