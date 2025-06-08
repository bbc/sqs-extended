import { Message as SQSMessage } from "@aws-sdk/client-sqs";
import type { ConsumerOptions } from "sqs-consumer";
import type { ProducerOptions, Message as ProducerMessage } from "sqs-producer";

export type ExtendedSQSMessage = SQSMessage & {
  body?: Record<string, any>;
};

/**
 * The options for the extended SQS consumer and producer.
 * Extends both ConsumerOptions and ProducerOptions to allow full access to all settings,
 * while adding S3 integration capabilities.
 */
export interface ExtendedOptions extends Omit<ConsumerOptions, 'sqs'>, Omit<ProducerOptions, 'sqs'> {
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
