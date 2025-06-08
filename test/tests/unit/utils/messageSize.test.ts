import { describe, it } from "mocha";
import { expect } from "chai";

import {
  getMessageAttributesSize,
  isLarge,
} from "../../../../src/utils/messageSize.js";
import { DEFAULT_MESSAGE_SIZE_THRESHOLD } from "../../../../src/constants.js";

describe("Message Size Utils", () => {
  describe("getMessageAttributesSize", () => {
    it("should calculate attribute size for message with attributes", () => {
      const messageAttributes = {
        attribute1: {
          DataType: "String",
          StringValue: "Value1",
        },
        attribute2: {
          DataType: "Number",
          StringValue: "123",
        },
      };

      const size = getMessageAttributesSize(messageAttributes);
      expect(size).to.be.greaterThan(0);
    });

    it("should calculate size for multiple attributes", () => {
      const messageAttributes = {
        attribute1: {
          DataType: "String",
          StringValue: "Value1",
        },
        attribute2: {
          DataType: "Number",
          StringValue: "123",
        },
      };

      const expectedSize =
        "attribute1".length +
        "String".length +
        "Value1".length +
        "attribute2".length +
        "Number".length +
        "123".length;

      const size = getMessageAttributesSize(messageAttributes);
      expect(size).to.be.at.least(expectedSize);
    });

    it("should handle undefined message attributes", () => {
      const size = getMessageAttributesSize(undefined);
      expect(size).to.equal(0);
    });

    it("should handle empty attributes object", () => {
      const size = getMessageAttributesSize({});
      expect(size).to.equal(0);
    });

    it("should calculate size with binary values", () => {
      const messageAttributes = {
        BinaryAttr: {
          DataType: "Binary",
          BinaryValue: Buffer.from("Binary value"),
        },
      };

      const size = getMessageAttributesSize(messageAttributes);
      expect(size).to.be.at.least(
        "BinaryAttr".length +
          "Binary".length +
          Buffer.from("Binary value").length,
      );
    });

    it("should handle null values in attributes", () => {
      const messageAttributes = {
        NullAttr1: {
          DataType: "String",
          StringValue: null,
        },
        NullAttr2: {
          DataType: "Binary",
          BinaryValue: null,
        },
      };

      const size = getMessageAttributesSize(messageAttributes);
      expect(size).to.be.at.least(
        "NullAttr1".length +
          "String".length +
          "NullAttr2".length +
          "Binary".length,
      );
    });

    it("should handle missing message attributes", () => {
      const messageAttributes = undefined;

      const size = getMessageAttributesSize(messageAttributes);
      expect(size).to.equal(0);
    });

    it("should handle complex attributes", () => {
      const messageAttributes = {
        ComplexAttr: {
          DataType: "String",
          StringValue: JSON.stringify({
            level1: {
              level2: {
                level3: {
                  array: [1, 2, 3, 4, 5],
                  string: "A longer string value to increase size",
                },
              },
            },
          }),
        },
      };

      const size = getMessageAttributesSize(messageAttributes);
      expect(size).to.be.greaterThan(0);
    });

    it("should calculate size of message attributes correctly", () => {
      const messageAttributes = {
        StringAttr: {
          DataType: "String",
          StringValue: "String value",
        },
        BinaryAttr: {
          DataType: "Binary",
          BinaryValue: Buffer.from("Binary value"),
        },
        NumberAttr: {
          DataType: "Number",
          StringValue: "12345",
        },
      };

      const totalSize = getMessageAttributesSize(messageAttributes);

      const attributeSizes =
        "StringAttr".length +
        "String".length +
        "String value".length +
        "BinaryAttr".length +
        "Binary".length +
        Buffer.from("Binary value").length +
        "NumberAttr".length +
        "Number".length +
        "12345".length;

      expect(totalSize).to.be.at.least(attributeSizes);
    });
  });

  describe("isLarge", () => {
    it("should return false for small message with default threshold", () => {
      const message = {
        MessageBody: "Small message",
      };

      expect(isLarge(message)).to.be.false;
    });

    it("should return true for large message exceeding default threshold", () => {
      const largeContent = "a".repeat(DEFAULT_MESSAGE_SIZE_THRESHOLD + 1000);
      const message = {
        MessageBody: largeContent,
      };

      expect(isLarge(message)).to.be.true;
    });

    it("should respect custom threshold", () => {
      const smallThreshold = 20;
      const message = {
        MessageBody: "This message exceeds 20 bytes for sure",
      };

      expect(isLarge(message, smallThreshold)).to.be.true;
      expect(isLarge(message, 1000)).to.be.false;
    });

    it("should consider message attributes in size calculation", () => {
      const contentSize = DEFAULT_MESSAGE_SIZE_THRESHOLD - 5000;
      const message = {
        MessageBody: "a".repeat(contentSize),
        MessageAttributes: {
          LargeAttribute: {
            DataType: "String",
            StringValue: "b".repeat(10000),
          },
        },
      };

      expect(isLarge(message)).to.be.true;

      const messageWithoutAttr = {
        MessageBody: "a".repeat(contentSize),
      };

      expect(isLarge(messageWithoutAttr)).to.be.false;
    });

    it("should handle edge case exactly at the threshold", () => {
      const content = "a".repeat(DEFAULT_MESSAGE_SIZE_THRESHOLD);
      const message = {
        MessageBody: content,
      };

      expect(isLarge(message)).to.be.false;

      const largerMessage = {
        MessageBody: content + "a",
      };

      expect(isLarge(largerMessage)).to.be.true;
    });
  });
});
