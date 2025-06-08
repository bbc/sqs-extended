/**
 * Base class for SQS Extended Client errors
 */
export class SQSExtendedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SQSExtendedError";
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when operations with S3 fail
 */
export class S3OperationError extends SQSExtendedError {
  public originalError?: Error;
  public operation: string;
  public key?: string;
  public bucket?: string;

  constructor(
    message: string,
    options: {
      operation: string;
      originalError?: Error;
      key?: string;
      bucket?: string;
    },
  ) {
    super(message);
    this.name = "S3OperationError";
    this.operation = options.operation;
    this.originalError = options.originalError;
    this.key = options.key;
    this.bucket = options.bucket;
  }
}

/**
 * Error thrown when SQS operations fail
 */
export class SQSOperationError extends SQSExtendedError {
  public originalError?: Error;
  public operation: string;

  constructor(
    message: string,
    options: {
      operation: string;
      originalError?: Error;
    },
  ) {
    super(message);
    this.name = "SQSOperationError";
    this.operation = options.operation;
    this.originalError = options.originalError;
  }
}

/**
 * Error thrown when message size exceeds limits
 */
export class MessageSizeError extends SQSExtendedError {
  public size: number;
  public threshold: number;

  constructor(message: string, size: number, threshold: number) {
    super(message);
    this.name = "MessageSizeError";
    this.size = size;
    this.threshold = threshold;
  }
}

/**
 * Error thrown when receipt handle manipulation fails
 */
export class ReceiptHandleError extends SQSExtendedError {
  constructor(message: string) {
    super(message);
    this.name = "ReceiptHandleError";
  }
}

/**
 * Helper function to wrap async operations with better error handling
 * @param operation Function to execute
 * @param errorMessage Base error message
 * @param errorClass Error class to use
 * @returns Result of the operation
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  errorClass: new (message: string, ...args: any[]) => Error,
  ...errorArgs: any[]
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`;
    throw new errorClass(message, ...errorArgs);
  }
}
