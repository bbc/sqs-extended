import { Consumer } from "sqs-consumer";
import { S3Client } from "@aws-sdk/client-s3";

import { S3Handler } from "./handler.js";
import { ExtendedOptions, ExtendedSQSMessage } from "./types.js";

export class SQSExtendedConsumer {
  private consumer: Consumer;

  constructor(
    options: ExtendedOptions & {
      handleMessage: (message: any) => Promise<void>;
    },
  ) {
    const s3Handler = new S3Handler(
      new S3Client(options.s3 || {}),
      options.s3Bucket,
      options.s3Prefix,
    );

    this.consumer = Consumer.create({
      queueUrl: options.queueUrl,
      handleMessage: async (message: ExtendedSQSMessage) => {
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
          const fullPayload = await s3Handler.download(body.s3Payload.key);
          newMessage.body = fullPayload;
        } else {
          newMessage.body = body;
        }
        await options.handleMessage(newMessage);
      },
      ...options.sqs,
    });
  }

  start() {
    this.consumer.start();
  }

  stop() {
    this.consumer.stop();
  }
}
