import { Consumer } from "sqs-consumer";
import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import type {
  UpdatableOptions,
  ConsumerOptions,
  StopOptions,
  Events,
} from "sqs-consumer";

import { S3Handler } from "./handler.js";
import { ExtendedOptions, ExtendedSQSMessage } from "./types.js";
import { extendOptionsIfDefined } from "./utils/options.js";
import {
  defaultReceiveTransform,
  getS3MessageKeyAndBucket,
} from "./utils/transformations.js";
import {
  embedS3MarkersInReceiptHandle,
  extractS3MessageKeyFromReceiptHandle,
  extractBucketNameFromReceiptHandle,
  hasS3Markers,
} from "./utils/receiptHandle.js";
import { S3_MESSAGE_BODY_KEY } from "./constants.js";

export class SQSExtendedConsumer {
  private consumer: Consumer;
  private s3Handler: S3Handler;
  private sqsClient?: SQSClient;
  private receiveTransform: (
    message: ExtendedSQSMessage,
    s3Content: any,
  ) => any;
  private useReceiptHandleMarkers: boolean;

  constructor(
    options: ExtendedOptions & {
      handleMessage: (message: any) => Promise<void>;
    },
  ) {
    const s3Client = new S3Client(options.s3 || {});
    this.s3Handler = new S3Handler(
      s3Client,
      options.s3Bucket,
      options.s3Prefix,
    );

    this.receiveTransform =
      options.receiveTransform || defaultReceiveTransform();
    this.useReceiptHandleMarkers = options.useReceiptHandleMarkers !== false;

    this.sqsClient = options.sqsClientOptions
      ? new SQSClient(options.sqsClientOptions)
      : undefined;

    const messageAttributeNames = options.messageAttributeNames || [];
    if (!messageAttributeNames.includes(S3_MESSAGE_BODY_KEY)) {
      messageAttributeNames.push(S3_MESSAGE_BODY_KEY);
    }

    const handleMessage = async (message: ExtendedSQSMessage) => {
      try {
        const newMessage = { ...message };
        let s3Content: any = null;

        const { bucketName: attrBucketName, s3MessageKey: attrS3Key } =
          getS3MessageKeyAndBucket(message);

        let bucketName = attrBucketName;
        let s3MessageKey = attrS3Key;

        if (
          this.useReceiptHandleMarkers &&
          !s3MessageKey &&
          message.ReceiptHandle
        ) {
          bucketName =
            extractBucketNameFromReceiptHandle(message.ReceiptHandle) ||
            bucketName;
          s3MessageKey =
            extractS3MessageKeyFromReceiptHandle(message.ReceiptHandle) ||
            s3MessageKey;
        }

        if (s3MessageKey && bucketName) {
          s3Content = await this.s3Handler.download(s3MessageKey, bucketName);

          if (
            this.useReceiptHandleMarkers &&
            message.ReceiptHandle &&
            !hasS3Markers(message.ReceiptHandle)
          ) {
            newMessage.ReceiptHandle = embedS3MarkersInReceiptHandle(
              bucketName,
              s3MessageKey,
              message.ReceiptHandle,
            );
          }
        }

        try {
          newMessage.body = this.receiveTransform(newMessage, s3Content);

          await options.handleMessage(newMessage);
        } catch (transformError) {
          console.error("Error in receive transformation:", transformError);
          throw transformError;
        }
      } catch (error) {
        console.error("Error processing SQS message:", error);
        throw error;
      }
    };

    const baseOptions = extendOptionsIfDefined({
      queueUrl: options.queueUrl,
      attributeNames: options.attributeNames,
      messageAttributeNames,
      messageSystemAttributeNames: options.messageSystemAttributeNames,
      batchSize: options.batchSize,
      visibilityTimeout: options.visibilityTimeout,
      waitTimeSeconds: options.waitTimeSeconds,
      authenticationErrorTimeout: options.authenticationErrorTimeout,
      pollingWaitTimeMs: options.pollingWaitTimeMs,
      pollingCompleteWaitTimeMs: options.pollingCompleteWaitTimeMs,
      terminateVisibilityTimeout: options.terminateVisibilityTimeout,
      heartbeatInterval: options.heartbeatInterval,
      region: options.region,
      useQueueUrlAsEndpoint: options.useQueueUrlAsEndpoint,
      handleMessageTimeout: options.handleMessageTimeout,
      shouldDeleteMessages: options.shouldDeleteMessages,
      alwaysAcknowledge: options.alwaysAcknowledge,
      extendedAWSErrors: options.extendedAWSErrors,
      suppressFifoWarning: options.suppressFifoWarning,
      preReceiveMessageCallback: options.preReceiveMessageCallback,
      postReceiveMessageCallback: options.postReceiveMessageCallback,
    });

    const consumerOptions: ConsumerOptions = {
      ...baseOptions,
      handleMessage,
      ...(this.sqsClient ? { sqs: this.sqsClient } : {}),
    };

    this.consumer = Consumer.create(consumerOptions);
  }

  /**
   * Start polling the queue for messages.
   */
  start(): void {
    this.consumer.start();
  }

  /**
   * Stop polling the queue for messages.
   * @param options Stop options (e.g. { abort: true } to abort current requests)
   */
  stop(options?: StopOptions): void {
    this.consumer.stop(options);
  }

  /**
   * Returns the current status of the consumer.
   * This includes whether it is running or currently polling.
   */
  get status() {
    return this.consumer.status;
  }

  /**
   * Access to event emitter methods.
   * Use this to attach event handlers to the consumer.
   * @example
   * consumer.on('message_received', (message) => {
   *   console.log(message);
   * });
   */
  on(event: keyof Events, listener: (...args: any[]) => void) {
    this.consumer.on(event, listener);
    return this;
  }

  /**
   * Validates and then updates the provided option to the provided value.
   * @param option The option to validate and then update
   * @param value The value to set the provided option to
   */
  updateOption(
    option: UpdatableOptions,
    value: ConsumerOptions[UpdatableOptions],
  ): void {
    this.consumer.updateOption(option, value);
  }
}
