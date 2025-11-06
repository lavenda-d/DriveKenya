export const errorHandler = (err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Default error response
  let error = {
    success: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    error.message = 'Validation error';
    error.details = err.details;
    return res.status(400).json(error);
  }

  if (err.code === '23505') { // PostgreSQL unique constraint violation
    error.message = 'Duplicate entry - resource already exists';
    return res.status(409).json(error);
  }

  if (err.code === '23503') { // PostgreSQL foreign key constraint violation
    error.message = 'Invalid reference - related resource not found';
    return res.status(400).json(error);
  }

  if (err.code === '23514') { // PostgreSQL check constraint violation
    error.message = 'Invalid data - constraint violation';
    return res.status(400).json(error);
  }

  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    return res.status(401).json(error);
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    return res.status(401).json(error);
  }

  // Handle Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.message = 'File too large';
    return res.status(413).json(error);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error.message = 'Unexpected file field';
    return res.status(400).json(error);
  }

  // Default server error
  res.status(err.status || 500).json(error);
};