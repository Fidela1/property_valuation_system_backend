import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.services'
import { generateToken } from '../utils/token';
import { AppError } from '../utils/AppError';
import passport from 'passport';

 export const createUser = async (req: Request, res: Response, next: NextFunction) => {

    try {
        const {name, email, phone, password} = req.body;
        
    const user = await authService.createUser(name, email, phone, password);
    
    return res.status(201).json({
        success: true,
        message: "User created successfully",
        data: {user}
        })
    } catch (error) {
       if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: error.message
    });
  }

  console.error(error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
    }  
 }

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const user = await authService.userLogin(email, password);
    const token = generateToken(user.id, user.email, user.role);
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        },

      }
    });

  } catch (err: any) {
    console.error("❌ Login error:", err.message);
    return res.status(401).json({
      success: false,
      message: err.message || "Invalid email or password"
    });
  }
};
export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email']
});

export const googleAuthCallback = (req: Request, res: Response, next: any) => {
  passport.authenticate('google', { session: false }, async (err: any, user: any) => {
    if (err || !user) {
      console.error('Google auth error:', err);
      return res.redirect(`http://localhost:3000/login?error=google_auth_failed`);
    }

    try {
      const result = await authService.handleGoogleAuthService(user);
      const token = generateToken(result.data.user.id, result.data.user.email, result.data.user.role);
      const userData = encodeURIComponent(JSON.stringify(result.data.user));
      
      return res.redirect(
        `http://localhost:3000/auth/callback?token=${token}&user=${userData}`
      );
    } catch (error) {
      console.error('Token generation error:', error);
      return res.redirect(`http://localhost:3000/login?error=token_generation_failed`);
    }
  })(req, res, next);
};
