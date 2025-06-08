import { describe, it } from "mocha";
import { expect } from "chai";

import {
  defaultSendTransform,
  defaultReceiveTransform,
} from "../../../../src/utils/transformations.js";
import { S3_MESSAGE_BODY_KEY } from "../../../../src/constants.js";

describe("Transformation Utils", () => {
  describe("defaultSendTransform", () => {
    const smallMessage = {
      MessageBody: "Small message body",
      MessageAttributes: {},
    };

    const largeMessageBody = "a".repeat(300000);
    const largeMessage = {
      MessageBody: largeMessageBody,
      MessageAttributes: {},
    };

    it("should not use S3 for small messages", () => {
      const transform = defaultSendTransform(false, 262144);

      const result = transform(smallMessage);

      expect(result.messageBody).to.equal(smallMessage.MessageBody);
      expect(result.s3Content).to.be.null;
    });

    it("should use S3 for large messages", () => {
      const transform = defaultSendTransform(false, 262144);

      const result = transform(largeMessage);

      expect(result.messageBody).to.be.null;
      expect(result.s3Content).to.equal(largeMessage.MessageBody);
    });

    it("should always use S3 when alwaysUseS3 is true", () => {
      const transform = defaultSendTransform(true, 262144);

      const result = transform(smallMessage);

      expect(result.messageBody).to.be.null;
      expect(result.s3Content).to.equal(smallMessage.MessageBody);
    });

    it("should respect custom size threshold", () => {
      const smallThreshold = 10;
      const transform = defaultSendTransform(false, smallThreshold);

      const result = transform(smallMessage);

      expect(result.messageBody).to.be.null;
      expect(result.s3Content).to.equal(smallMessage.MessageBody);
    });
  });

  describe("defaultReceiveTransform", () => {
    const messageWithoutS3 = {
      MessageId: "test-id",
      Body: JSON.stringify({ key: "value" }),
    };

    const messageWithS3Attribute = {
      MessageId: "test-id",
      Body: "{}",
      MessageAttributes: {
        [S3_MESSAGE_BODY_KEY]: {
          DataType: "String",
          StringValue: "(test-bucket)test-key",
        },
      },
    };

    const s3Content = JSON.stringify({ s3Key: "s3Value" });

    it("should parse regular message body when no S3 content", () => {
      const transform = defaultReceiveTransform();
      const result = transform(messageWithoutS3, null);

      expect(result).to.equal(messageWithoutS3.Body);
    });

    it("should use S3 content when present", () => {
      const transform = defaultReceiveTransform();
      const result = transform(messageWithS3Attribute, s3Content);

      expect(result).to.equal(s3Content);
    });

    it("should handle invalid JSON in message body", () => {
      const messageWithInvalidJson = {
        MessageId: "test-id",
        Body: "not-json",
      };

      const transform = defaultReceiveTransform();
      const result = transform(messageWithInvalidJson, null);

      expect(result).to.equal("not-json");
    });

    it("should handle invalid JSON in S3 content", () => {
      const transform = defaultReceiveTransform();
      const result = transform(messageWithS3Attribute, "invalid-json");

      expect(result).to.equal("invalid-json");
    });

    it("should handle null message body", () => {
      const messageWithNullBody = {
        MessageId: "test-id",
        Body: null as unknown as string,
      };

      const transform = defaultReceiveTransform();
      const result = transform(messageWithNullBody, null);

      expect(result).to.be.undefined;
    });

    it("should handle empty message body", () => {
      const messageWithEmptyBody = {
        MessageId: "test-id",
        Body: "",
      };

      const transform = defaultReceiveTransform();
      const result = transform(messageWithEmptyBody, null);

      expect(result).to.be.undefined;
    });

    it("should prefer S3 content over message body when both exist", () => {
      const messageWithBoth = {
        MessageId: "test-id",
        Body: JSON.stringify({ key: "value" }),
        MessageAttributes: messageWithS3Attribute.MessageAttributes,
      };

      const transform = defaultReceiveTransform();
      const result = transform(messageWithBoth, s3Content);

      expect(result).to.equal(s3Content);
    });
  });
});
