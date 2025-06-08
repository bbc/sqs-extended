import { Consumer } from "sqs-consumer";
import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import type { UpdatableOptions, ConsumerOptions, StopOptions, Events } from "sqs-consumer";

import { S3Handler } from "./handler.js";
import { ExtendedOptions, ExtendedSQSMessage } from "./types.js";
import { extendOptionsIfDefined } from "./utils.js";

export class SQSExtendedConsumer {
  private consumer: Consumer;
  private s3Handler: S3Handler;

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

    const sqsClient = options.sqsClientOptions ? 
      new SQSClient(options.sqsClientOptions) : 
      undefined;
      
    const handleMessage = async (message: ExtendedSQSMessage) => {
      let body: {
        s3Payload?: {
          key: string;
        };
      } = {};
      try {
        body = JSON.parse(message.Body || "{}");
      } catch (error) {
        body = {};
      }

      const newMessage = message;

      if (body?.s3Payload) {
        const fullPayload = await this.s3Handler.download(body.s3Payload.key);
        newMessage.body = fullPayload;
      } else {
        newMessage.body = body;
      }
      await options.handleMessage(newMessage);
    };
    
    const baseOptions = extendOptionsIfDefined({
      queueUrl: options.queueUrl,
      attributeNames: options.attributeNames,
      messageAttributeNames: options.messageAttributeNames,
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
      postReceiveMessageCallback: options.postReceiveMessageCallback
    });
    
    const consumerOptions: ConsumerOptions = {
      ...baseOptions,
      handleMessage,
      ...(sqsClient ? { sqs: sqsClient } : {})
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
  updateOption(option: UpdatableOptions, value: ConsumerOptions[UpdatableOptions]): void {
    this.consumer.updateOption(option, value);
  }
}
