import { Producer } from "sqs-producer";
import { S3Client } from "@aws-sdk/client-s3";

import { S3Handler } from "./handler.js";
import { ExtendedOptions } from "./types.js";

export class SQSExtendedProducer {
  private producer;
  private s3Handler;
  private sizeThreshold;

  constructor(options: ExtendedOptions) {
    this.producer = Producer.create({ queueUrl: options.queueUrl });
    const s3Client = new S3Client(options.s3 || {});
    this.s3Handler = new S3Handler(
      s3Client,
      options.s3Bucket,
      options.s3Prefix,
    );
    this.sizeThreshold = options.sizeThreshold || 262144;
  }

  async send({ id, body }: { id: string; body: any }) {
    const payloadStr = JSON.stringify(body);
    if (Buffer.byteLength(payloadStr) > this.sizeThreshold) {
      const key = await this.s3Handler.upload(body);
      return this.producer.send({
        id,
        body: { s3Payload: { bucket: this.s3Handler.bucket, key } },
      });
    }
    return this.producer.send({ id, body });
  }
}
