import { Message as SQSMessage } from "@aws-sdk/client-sqs";
import type { ConsumerOptions } from "sqs-consumer";
import type { ProducerOptions, Message as ProducerMessage } from "sqs-producer";

/**
 * Interface for the result of a send transformation
 */
export interface SendTransformResult {
  /** The message body to send directly via SQS, null if using S3 */
  messageBody: string | null;
  /** The content to store in S3, null if sending directly via SQS */
  s3Content: string | null;
}

/**
 * Interface for S3 message metadata
 */
export interface S3MessageMetadata {
  bucketName: string | null;
  s3MessageKey: string | null;
}

export type ExtendedSQSMessage = SQSMessage & {
  body?: Record<string, any>;
};

/**
 * Transformation function for sending messages
 * Determines whether to store the message body in S3 based on size or other criteria
 */
export type SendTransformFunction = (message: {
  MessageBody: string;
  MessageAttributes?: Record<string, any>;
}) => SendTransformResult;

/**
 * Transformation function for receiving messages
 * Processes the message body, potentially handling S3-stored content
 */
export type ReceiveTransformFunction = (
  message: any,
  s3Content: string | null,
) => any;

/**
 * The options for the extended SQS consumer and producer.
 * Extends both ConsumerOptions and ProducerOptions to allow full access to all settings,
 * while adding S3 integration capabilities.
 */
export interface ExtendedOptions
  extends Omit<ConsumerOptions, "sqs">,
    Omit<ProducerOptions, "sqs"> {
  /**
   * The SQS queue URL.
   */
  queueUrl: string;
  /**
   * The S3 bucket name.
   */
  s3Bucket: string;
  /**
   * The S3 prefix.
   */
  s3Prefix?: string;
  /**
   * The size threshold in bytes. Messages larger than this will be stored in S3.
   * @defaultvalue `262144`
   */
  sizeThreshold?: number;
  /**
   * The S3 TTL in seconds.
   */
  s3TtlSeconds?: number;
  /**
   * The SQS client options.
   */
  sqsClientOptions?: { region?: string; credentials?: any };
  /**
   * The S3 client options.
   */
  s3?: { region?: string; credentials?: any };
  /**
   * Whether to always use S3 regardless of message size
   * @defaultvalue false
   */
  alwaysUseS3?: boolean;
  /**
   * Custom function to determine if a message should be stored in S3
   * If provided, overrides the default behavior based on message size
   */
  sendTransform?: SendTransformFunction;
  /**
   * Custom function to process message bodies when receiving
   * If provided, overrides the default behavior
   */
  receiveTransform?: ReceiveTransformFunction;
  /**
   * Whether to use receipt handle markers to track S3 content
   * @defaultvalue true
   */
  useReceiptHandleMarkers?: boolean;
}

/**
 * Extended message type for producer with additional S3-specific fields
 */
export interface ExtendedMessage extends ProducerMessage {
  /**
   * The message body can be any serializable object
   * If the serialized message exceeds sizeThreshold, it will be stored in S3
   */
  body: any;
}

/**
 * Information about S3-stored messages
 */
export interface S3PayloadInfo {
  bucket: string;
  key: string;
}

/**
 * Structure of a message body when S3 storage is used
 */
export interface S3MessageBody {
  s3Payload: S3PayloadInfo;
}
