import { Request, Response, NextFunction } from 'express';


export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  
  if (err.code === 'P2002') {
    const field = err?.meta?.target?.[0] ?? 'email or phone number'; 
    res.status(409).json({
      success: false,
      message: `${field} already exist`,
    });
    return;
  }

 
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again.',
  });
};