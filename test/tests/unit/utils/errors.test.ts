import { describe, it } from "mocha";
import { expect } from "chai";

import {
  SQSOperationError,
  S3OperationError,
  SQSExtendedError,
  MessageSizeError,
  ReceiptHandleError,
} from "../../../../src/utils/errors.js";

describe("Error Utils", () => {
  describe("SQSOperationError", () => {
    it("should create error with correct properties", () => {
      const originalError = new Error("Original error");
      const operation = "send";
      const errorMessage = "Failed to send message";

      const error = new SQSOperationError(errorMessage, {
        operation,
        originalError,
      });

      expect(error).to.be.instanceOf(Error);
      expect(error).to.be.instanceOf(SQSExtendedError);
      expect(error).to.be.instanceOf(SQSOperationError);
      expect(error.message).to.equal(errorMessage);
      expect(error.operation).to.equal(operation);
      expect(error.originalError).to.equal(originalError);
    });
  });

  describe("S3OperationError", () => {
    it("should create error with correct properties", () => {
      const originalError = new Error("Original error");
      const operation = "download";
      const errorMessage = "Failed to download from S3";
      const key = "test-key";
      const bucket = "test-bucket";

      const error = new S3OperationError(errorMessage, {
        operation,
        originalError,
        key,
        bucket,
      });

      expect(error).to.be.instanceOf(Error);
      expect(error).to.be.instanceOf(SQSExtendedError);
      expect(error).to.be.instanceOf(S3OperationError);
      expect(error.message).to.equal(errorMessage);
      expect(error.operation).to.equal(operation);
      expect(error.originalError).to.equal(originalError);
      expect(error.key).to.equal(key);
      expect(error.bucket).to.equal(bucket);
    });
  });

  describe("MessageSizeError", () => {
    it("should create error with correct properties", () => {
      const errorMessage = "Message size exceeded threshold";
      const size = 300000;
      const threshold = 262144;

      const error = new MessageSizeError(errorMessage, size, threshold);

      expect(error).to.be.instanceOf(Error);
      expect(error).to.be.instanceOf(SQSExtendedError);
      expect(error).to.be.instanceOf(MessageSizeError);
      expect(error.message).to.equal(errorMessage);
      expect(error.size).to.equal(size);
      expect(error.threshold).to.equal(threshold);
    });
  });

  describe("ReceiptHandleError", () => {
    it("should create error with correct properties", () => {
      const errorMessage = "Failed to process receipt handle";

      const error = new ReceiptHandleError(errorMessage);

      expect(error).to.be.instanceOf(Error);
      expect(error).to.be.instanceOf(SQSExtendedError);
      expect(error).to.be.instanceOf(ReceiptHandleError);
      expect(error.message).to.equal(errorMessage);
    });
  });

  describe("SQSExtendedError", () => {
    it("should create base error with correct properties", () => {
      const errorMessage = "Base error message";

      const error = new SQSExtendedError(errorMessage);

      expect(error).to.be.instanceOf(Error);
      expect(error).to.be.instanceOf(SQSExtendedError);
      expect(error.message).to.equal(errorMessage);
      expect(error.name).to.equal("SQSExtendedError");
    });
  });
});
