// Custom error class hierarchy for the D&M Deal Portal.
// Provides typed errors with HTTP-like status codes for server actions
// and a user-friendly message extractor for UI display.
//
// Azure migration: These map directly to Azure Application Insights
// exception telemetry with customDimensions for filtering.

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'APP_ERROR',
    isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends AppError {
  public readonly fields: Record<string, string>;

  constructor(message: string, fields: Record<string, string> = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id?: string) {
    const msg = id ? `${resource} (${id}) not found` : `${resource} not found`;
    super(msg, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'This action conflicts with the current state') {
    super(message, 409, 'CONFLICT_ERROR');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfterMs: number;

  constructor(message = 'Too many requests. Please try again later.', retryAfterMs = 60000) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

export class DatabaseError extends AppError {
  constructor(message = 'A database error occurred', originalError?: Error) {
    super(
      process.env.NODE_ENV === 'development' && originalError
        ? `${message}: ${originalError.message}`
        : message,
      500,
      'DATABASE_ERROR',
      true
    );
    this.name = 'DatabaseError';
    if (originalError?.stack) {
      this.stack = originalError.stack;
    }
  }
}

export class StorageError extends AppError {
  constructor(message = 'A file storage error occurred') {
    super(message, 500, 'STORAGE_ERROR');
    this.name = 'StorageError';
  }
}

// User-friendly error message extractor
// Provides clean messages for the UI while keeping full details in logs
export function getUserMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.message;
  }
  if (error instanceof AuthenticationError) {
    return 'Please sign in to continue.';
  }
  if (error instanceof AuthorizationError) {
    return 'You do not have permission to perform this action.';
  }
  if (error instanceof NotFoundError) {
    return error.message;
  }
  if (error instanceof RateLimitError) {
    return error.message;
  }
  if (error instanceof AppError) {
    return error.isOperational ? error.message : 'An unexpected error occurred. Please try again.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}

// Type guard for checking if an error is operational (expected)
// vs programmer/system errors (unexpected)
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

// Extract HTTP-like status code from any error
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}
