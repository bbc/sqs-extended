import {
  Message as SQSMessage,
} from "@aws-sdk/client-sqs";

export type ExtendedSQSMessage = SQSMessage & {
  body?: Record<string, any>;
};

/**
 * The options for the consumer.
 */
export interface ExtendedOptions {
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
   * The size threshold in bytes.
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
  sqs?: { region?: string; credentials?: any };
  /**
   * The S3 client options.
   */
  s3?: { region?: string; credentials?: any };
}