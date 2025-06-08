import { DEFAULT_MESSAGE_SIZE_THRESHOLD } from "../constants.js";

/**
 * Calculate the size of message attributes in bytes
 * @param messageAttributes The message attributes to calculate size for
 * @returns The total size in bytes
 */
export function getMessageAttributesSize(
  messageAttributes: Record<string, any> | undefined,
): number {
  if (!messageAttributes) {
    return 0;
  }

  let size = 0;

  Object.keys(messageAttributes).forEach((attrKey) => {
    const attr = messageAttributes[attrKey];

    size += Buffer.byteLength(attrKey, "utf8");
    size += Buffer.byteLength(attr.DataType, "utf8");

    if (typeof attr.StringValue !== "undefined" && attr.StringValue !== null) {
      size += Buffer.byteLength(attr.StringValue, "utf8");
    }

    if (typeof attr.BinaryValue !== "undefined" && attr.BinaryValue !== null) {
      size += Buffer.byteLength(attr.BinaryValue, "utf8");
    }
  });

  return size;
}

/**
 * Determine if a message is considered "large" based on the threshold
 * @param message The message to evaluate
 * @param messageSizeThreshold The size threshold to use (defaults to 256KB)
 * @returns True if the message exceeds the threshold
 */
export function isLarge(
  message: { MessageBody: string; MessageAttributes?: Record<string, any> },
  messageSizeThreshold = DEFAULT_MESSAGE_SIZE_THRESHOLD,
): boolean {
  const messageAttributeSize = getMessageAttributesSize(
    message.MessageAttributes,
  );
  const bodySize = Buffer.byteLength(message.MessageBody, "utf8");
  return messageAttributeSize + bodySize > messageSizeThreshold;
}
