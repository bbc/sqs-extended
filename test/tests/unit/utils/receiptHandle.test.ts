import { describe, it } from "mocha";
import { expect } from "chai";
import {
  embedS3MarkersInReceiptHandle,
  extractBucketNameFromReceiptHandle,
  extractS3MessageKeyFromReceiptHandle,
  getOriginalReceiptHandle,
} from "../../../../src/utils/receiptHandle.js";
import {
  S3_BUCKET_NAME_MARKER,
  S3_MESSAGE_KEY_MARKER,
} from "../../../../src/constants.js";

describe("Receipt Handle Utils", () => {
  const bucketName = "test-bucket";
  const s3MessageKey = "test-s3-key";
  const originalReceiptHandle = "original-receipt-handle";

  describe("embedS3MarkersInReceiptHandle", () => {
    it("should embed S3 markers in receipt handle", () => {
      const result = embedS3MarkersInReceiptHandle(
        bucketName,
        s3MessageKey,
        originalReceiptHandle,
      );

      expect(result).to.include(originalReceiptHandle);
      expect(result).to.include(S3_BUCKET_NAME_MARKER);
      expect(result).to.include(S3_MESSAGE_KEY_MARKER);
      expect(result).to.include(bucketName);
      expect(result).to.include(s3MessageKey);
    });

    it("should handle special characters in bucket and key names", () => {
      const complexBucket = "test-bucket.with.special-chars_123";
      const complexKey = "folder/with space/file-name_123.json";

      const result = embedS3MarkersInReceiptHandle(
        complexBucket,
        complexKey,
        originalReceiptHandle,
      );

      expect(result).to.include(originalReceiptHandle);
      expect(result).to.include(complexBucket);
      expect(result).to.include(complexKey);
    });
  });

  describe("extractBucketNameFromReceiptHandle", () => {
    it("should extract bucket name from receipt handle", () => {
      const embeddedReceiptHandle = embedS3MarkersInReceiptHandle(
        bucketName,
        s3MessageKey,
        originalReceiptHandle,
      );
      const extractedBucket = extractBucketNameFromReceiptHandle(
        embeddedReceiptHandle,
      );

      expect(extractedBucket).to.equal(bucketName);
    });

    it("should return null if no bucket name is embedded", () => {
      const result = extractBucketNameFromReceiptHandle(originalReceiptHandle);
      expect(result).to.be.null;
    });
  });

  describe("extractS3MessageKeyFromReceiptHandle", () => {
    it("should extract S3 key from receipt handle", () => {
      const embeddedReceiptHandle = embedS3MarkersInReceiptHandle(
        bucketName,
        s3MessageKey,
        originalReceiptHandle,
      );
      const extractedKey = extractS3MessageKeyFromReceiptHandle(
        embeddedReceiptHandle,
      );

      expect(extractedKey).to.equal(s3MessageKey);
    });

    it("should return null if no message key is embedded", () => {
      const result = extractS3MessageKeyFromReceiptHandle(
        originalReceiptHandle,
      );
      expect(result).to.be.null;
    });
  });

  describe("getOriginalReceiptHandle", () => {
    it("should get original receipt handle from embedded receipt handle", () => {
      const embeddedReceiptHandle = embedS3MarkersInReceiptHandle(
        bucketName,
        s3MessageKey,
        originalReceiptHandle,
      );
      const result = getOriginalReceiptHandle(embeddedReceiptHandle);

      expect(result).to.equal(originalReceiptHandle);
    });

    it("should return unchanged receipt handle if no metadata is embedded", () => {
      const result = getOriginalReceiptHandle(originalReceiptHandle);
      expect(result).to.equal(originalReceiptHandle);
    });
  });
});
