import { Consumer } from 'sqs-consumer';
import { S3Client } from '@aws-sdk/client-s3';

import { S3Handler } from './handler.js';
import { ExtendedOptions } from './types.js';

export class SQSExtendedConsumer {
  private consumer;

  constructor(options: ExtendedOptions & { handleMessage: (message: any) => Promise<void> }) {
    const s3Handler = new S3Handler(new S3Client(options.s3 || {}), options.s3Bucket, options.s3Prefix);

    this.consumer = Consumer.create({
      queueUrl: options.queueUrl,
      handleMessage: async (message) => {
        const body = JSON.parse(message.Body || '{}');
        if (body?.s3Payload) {
          const fullPayload = await s3Handler.download(body.s3Payload.key);
          // Add custom property to store the processed body
          (message as any).body = fullPayload;
        } else {
          // Add custom property to store the processed body
          (message as any).body = body;
        }
        await options.handleMessage(message);
      },
      ...options.sqs
    });
  }

  start() {
    this.consumer.start();
  }

  stop() {
    this.consumer.stop();
  }
}