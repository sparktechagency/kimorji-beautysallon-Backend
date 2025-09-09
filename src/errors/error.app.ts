import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

interface ErrorResponse {
  status: string;
  message: string;
  error?: any;
  stack?: string;
}

export const errorHandler = async (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.error('=== ERROR HANDLER DEBUG ===');
    console.error('Error:', err.message);
    console.error('Headers sent:', res.headersSent);
    console.error('========================');
    
    // CRITICAL: Check if headers are already sent
    if (res.headersSent) {
      console.error('Headers already sent, delegating to Express default error handler');
      return next(err);
    }

    let statusCode = 500;
    let message = 'Internal Server Error';

    // Handle AppError (custom errors)
    if (err instanceof AppError) {
      statusCode = err.statusCode;
      message = err.message;
    }
    // Handle validation errors
    else if (err.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation Error';
    }
    // Handle MongoDB duplicate key errors
    else if (err.name === 'MongoError' && (err as any).code === 11000) {
      statusCode = 400;
      message = 'Duplicate field value';
    }
    // Handle JWT errors
    else if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
    }
    else if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
    }

    const errorResponse: ErrorResponse = {
      status: statusCode >= 400 && statusCode < 500 ? 'fail' : 'error',
      message,
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.error = err;
      errorResponse.stack = err.stack;
    }

    // Send error response
    res.status(statusCode).json(errorResponse);
  } catch (middlewareError) {
    // If error middleware itself fails, log it and delegate to Express
    console.error('Error in error middleware:', middlewareError);
    
    // Only try to send response if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).json({
        status: 'error',
        message: 'Internal Server Error'
      });
    }
  }
};