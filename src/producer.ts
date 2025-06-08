import { Producer } from "sqs-producer";
import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient } from "@aws-sdk/client-sqs";
import type { ProducerOptions } from "sqs-producer";

import { S3Handler } from "./handler.js";
import { ExtendedOptions, ExtendedMessage } from "./types.js";
import { extendOptionsIfDefined } from "./utils.js";

export class SQSExtendedProducer {
  private producer;
  private s3Handler;
  private sizeThreshold;

  constructor(options: ExtendedOptions) {
    const s3Client = new S3Client(options.s3 || {});
    this.s3Handler = new S3Handler(
      s3Client,
      options.s3Bucket,
      options.s3Prefix,
    );
    this.sizeThreshold = options.sizeThreshold || 262144;

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
   * Send a message to the queue
   * If the message exceeds the size threshold, it will be stored in S3
   *
   * @param message The message to send
   * @returns The result from the underlying producer
   */
  async send(message: ExtendedMessage) {
    const { id, body, ...otherMessageProps } = message;
    const payloadStr = JSON.stringify(body);

    if (Buffer.byteLength(payloadStr) > this.sizeThreshold) {
      const key = await this.s3Handler.upload(body);
      return this.producer.send({
        id,
        body: JSON.stringify({
          s3Payload: { bucket: this.s3Handler.bucket, key },
        }),
        ...otherMessageProps,
      });
    }

    return this.producer.send({
      id,
      body: JSON.stringify(body),
      ...otherMessageProps,
    });
  }

  /**
   * Send multiple messages to the queue
   * Messages exceeding the size threshold will be stored in S3
   *
   * @param messages Array of messages to send
   * @returns The result from the underlying producer
   */
  async sendBatch(messages: ExtendedMessage[]) {
    const processedMessages = await Promise.all(
      messages.map(async (message) => {
        const { id, body, ...otherMessageProps } = message;
        const payloadStr = JSON.stringify(body);

        if (Buffer.byteLength(payloadStr) > this.sizeThreshold) {
          const key = await this.s3Handler.upload(body);
          return {
            id,
            body: JSON.stringify({
              s3Payload: { bucket: this.s3Handler.bucket, key },
            }),
            ...otherMessageProps,
          };
        }

        return {
          id,
          body: JSON.stringify(body),
          ...otherMessageProps,
        };
      }),
    );

    return this.producer.sendBatch(processedMessages);
  }

  /**
   * Access to the underlying producer instance
   */
  get instance() {
    return this.producer;
  }
}
