import { isLarge } from "./messageSize.js";
import type { SendTransformResult, S3MessageMetadata } from "../types.js";
import { S3_MESSAGE_BODY_KEY } from "../constants.js";

/**
 * Creates a default send transformation function
 * @param alwaysUseS3 Whether to always use S3 regardless of message size
 * @param messageSizeThreshold Size threshold for storing in S3
 * @returns A transformation function that determines whether to use S3 based on message size
 */
export function defaultSendTransform(
  alwaysUseS3: boolean,
  messageSizeThreshold: number,
) {
  return (message: {
    MessageBody: string;
    MessageAttributes?: Record<string, any>;
  }): SendTransformResult => {
    const useS3 = alwaysUseS3 || isLarge(message, messageSizeThreshold);

    return {
      messageBody: useS3 ? null : message.MessageBody,
      s3Content: useS3 ? message.MessageBody : null,
    };
  };
}

/**
 * Creates a default receive transformation function
 * @returns A transformation function that handles messages with S3 content
 */
export function defaultReceiveTransform() {
  return (message: any, s3Content: string | null): any => {
    return s3Content || message.Body || message.body;
  };
}

/**
 * Extracts S3 message key and bucket information from message attributes
 * @param message The SQS message to extract from
 * @returns Object containing bucket name and S3 message key
 */
export function getS3MessageKeyAndBucket(message: any): S3MessageMetadata {
  const messageAttributes =
    message.messageAttributes || message.MessageAttributes || {};

  if (!messageAttributes[S3_MESSAGE_BODY_KEY]) {
    return {
      bucketName: null,
      s3MessageKey: null,
    };
  }

  const s3MessageKeyAttr = messageAttributes[S3_MESSAGE_BODY_KEY];
  const s3MessageKey =
    s3MessageKeyAttr.stringValue || s3MessageKeyAttr.StringValue;

  if (!s3MessageKey) {
    throw new Error(
      `Invalid ${S3_MESSAGE_BODY_KEY} message attribute: Missing stringValue/StringValue`,
    );
  }

  const s3MessageKeyRegexMatch = s3MessageKey.match(/^\((.*)\)(.+)/);
  if (!s3MessageKeyRegexMatch) {
    throw new Error(
      `Invalid ${S3_MESSAGE_BODY_KEY} format: Expected "(bucketName)messageKey"`,
    );
  }

  return {
    bucketName: s3MessageKeyRegexMatch[1],
    s3MessageKey: s3MessageKeyRegexMatch[2],
  };
}

/**
 * Adds S3 message key attribute to message attributes
 * @param s3MessageKey The S3 message key to add
 * @param attributes The existing message attributes
 * @returns Updated message attributes
 */
export function addS3MessageKeyAttribute(
  s3MessageKey: string,
  attributes: Record<string, any> = {},
): Record<string, any> {
  return {
    ...attributes,
    [S3_MESSAGE_BODY_KEY]: {
      DataType: "String",
      StringValue: s3MessageKey,
    },
  };
}
