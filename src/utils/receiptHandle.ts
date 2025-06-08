import { S3_BUCKET_NAME_MARKER, S3_MESSAGE_KEY_MARKER } from "../constants.js";

/**
 * Embeds S3 bucket name and key in the receipt handle
 * @param bucketName S3 bucket name
 * @param s3MessageKey S3 object key
 * @param receiptHandle Original SQS receipt handle
 * @returns Modified receipt handle with embedded S3 metadata
 */
export function embedS3MarkersInReceiptHandle(
  bucketName: string,
  s3MessageKey: string,
  receiptHandle: string,
): string {
  return `${S3_BUCKET_NAME_MARKER}${bucketName}${S3_BUCKET_NAME_MARKER}${S3_MESSAGE_KEY_MARKER}${s3MessageKey}${S3_MESSAGE_KEY_MARKER}${receiptHandle}`;
}

/**
 * Extracts the S3 bucket name from a receipt handle
 * @param receiptHandle Receipt handle that may contain S3 metadata
 * @returns The bucket name or null if not found
 */
export function extractBucketNameFromReceiptHandle(
  receiptHandle: string,
): string | null {
  if (receiptHandle.includes(S3_BUCKET_NAME_MARKER)) {
    return receiptHandle.substring(
      receiptHandle.indexOf(S3_BUCKET_NAME_MARKER) +
        S3_BUCKET_NAME_MARKER.length,
      receiptHandle.lastIndexOf(S3_BUCKET_NAME_MARKER),
    );
  }
  return null;
}

/**
 * Extracts the S3 object key from a receipt handle
 * @param receiptHandle Receipt handle that may contain S3 metadata
 * @returns The S3 object key or null if not found
 */
export function extractS3MessageKeyFromReceiptHandle(
  receiptHandle: string,
): string | null {
  if (receiptHandle.includes(S3_MESSAGE_KEY_MARKER)) {
    return receiptHandle.substring(
      receiptHandle.indexOf(S3_MESSAGE_KEY_MARKER) +
        S3_MESSAGE_KEY_MARKER.length,
      receiptHandle.lastIndexOf(S3_MESSAGE_KEY_MARKER),
    );
  }
  return null;
}

/**
 * Gets the original SQS receipt handle without any S3 metadata
 * @param receiptHandle Receipt handle that may contain S3 metadata
 * @returns The original receipt handle
 */
export function getOriginalReceiptHandle(receiptHandle: string): string {
  return receiptHandle.includes(S3_MESSAGE_KEY_MARKER)
    ? receiptHandle.substring(
        receiptHandle.lastIndexOf(S3_MESSAGE_KEY_MARKER) +
          S3_MESSAGE_KEY_MARKER.length,
      )
    : receiptHandle;
}

/**
 * Checks if a receipt handle has embedded S3 metadata
 * @param receiptHandle Receipt handle to check
 * @returns True if the receipt handle contains S3 metadata
 */
export function hasS3Markers(receiptHandle: string): boolean {
  return (
    receiptHandle.includes(S3_MESSAGE_KEY_MARKER) &&
    receiptHandle.includes(S3_BUCKET_NAME_MARKER)
  );
}
