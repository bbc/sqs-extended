import { Producer } from "sqs-producer";
import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import type { ProducerOptions } from "sqs-producer";
import { v4 as uuidv4 } from "uuid";

import { S3Handler } from "./handler.js";
import { ExtendedOptions, ExtendedMessage } from "./types.js";
import { extendOptionsIfDefined } from "./utils/options.js";
import {
  defaultSendTransform,
  addS3MessageKeyAttribute,
} from "./utils/transformations.js";
import { SQSOperationError, withErrorHandling } from "./utils/errors.js";
import { DEFAULT_MESSAGE_SIZE_THRESHOLD } from "./constants.js";

export class SQSExtendedProducer {
  private producer;
  private s3Handler;
  private sizeThreshold;
  private sendTransform;
  private alwaysUseS3;

  constructor(options: ExtendedOptions) {
    const s3Client = new S3Client(options.s3 || {});
    this.s3Handler = new S3Handler(
      s3Client,
      options.s3Bucket,
      options.s3Prefix,
    );

    this.sizeThreshold =
      options.sizeThreshold || DEFAULT_MESSAGE_SIZE_THRESHOLD;
    this.alwaysUseS3 = options.alwaysUseS3 || false;

    this.sendTransform =
      options.sendTransform ||
      defaultSendTransform(this.alwaysUseS3, this.sizeThreshold);

    const sqsClient = options.sqsClientOptions
      ? new SQSClient(options.sqsClientOptions)
      : undefined;

    const baseOptions = extendOptionsIfDefined({
      queueUrl: options.queueUrl,
      batchSize: options.batchSize,
      region: options.region,
      useQueueUrlAsEndpoint: options.useQueueUrlAsEndpoint,
    });

    const producerOptions: ProducerOptions = {
      ...baseOptions,
      ...(sqsClient ? { sqs: sqsClient } : {}),
    };

    this.producer = Producer.create(producerOptions);
  }

  /**
   * Prepare a message for sending, determining if it should be stored in S3
   * @param message The message to prepare
   * @returns Object with processed message and S3 information if applicable
   */
  private async prepareMessage(message: ExtendedMessage) {
    const { id, body, messageAttributes = {}, ...otherMessageProps } = message;
    const payloadStr = JSON.stringify(body);

    const transformResult = this.sendTransform({
      MessageBody: payloadStr,
      MessageAttributes: messageAttributes,
    });

    if (transformResult.s3Content) {
      const s3Key = uuidv4();

      await this.s3Handler.upload(body, s3Key);

      const formattedS3Key = `(${this.s3Handler.bucket})${s3Key}`;

      const updatedAttributes = addS3MessageKeyAttribute(
        formattedS3Key,
        messageAttributes,
      );

      return {
        preparedMessage: {
          id,
          body: JSON.stringify({
            s3Payload: { bucket: this.s3Handler.bucket, key: s3Key },
          }),
          messageAttributes: updatedAttributes,
          ...otherMessageProps,
        },
        s3Info: { bucket: this.s3Handler.bucket, key: s3Key },
      };
    }

    return {
      preparedMessage: {
        id,
        body: JSON.stringify(body),
        messageAttributes,
        ...otherMessageProps,
      },
      s3Info: null,
    };
  }

  /**
   * Send a message to the queue
   * If the message exceeds the size threshold, it will be stored in S3
   *
   * @param message The message to send
   * @returns The result from the underlying producer
   */
  async send(message: ExtendedMessage) {
    return withErrorHandling(
      async () => {
        const { preparedMessage } = await this.prepareMessage(message);
        return this.producer.send(preparedMessage);
      },
      "Failed to send message to SQS",
      SQSOperationError,
      { operation: "send" },
    );
  }

  /**
   * Send multiple messages to the queue
   * Messages exceeding the size threshold will be stored in S3
   *
   * @param messages Array of messages to send
   * @returns The result from the underlying producer
   */
  async sendBatch(messages: ExtendedMessage[]) {
    return withErrorHandling(
      async () => {
        const processedResults = await Promise.all(
          messages.map((message) => this.prepareMessage(message)),
        );

        const processedMessages = processedResults.map(
          (result) => result.preparedMessage,
        );
        return this.producer.sendBatch(processedMessages);
      },
      "Failed to send batch of messages to SQS",
      SQSOperationError,
      { operation: "sendBatch" },
    );
  }
}
