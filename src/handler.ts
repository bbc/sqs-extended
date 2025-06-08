import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { Readable } from "stream";

import { S3OperationError, withErrorHandling } from "./utils/errors.js";

export class S3Handler {
  private s3: S3Client;
  readonly bucket: string;
  private prefix: string;

  constructor(s3: S3Client, bucket: string, prefix = "") {
    this.s3 = s3;
    this.bucket = bucket;
    this.prefix = prefix;
  }

  /**
   * Upload a payload to S3
   * @param payload The data to upload to S3
   * @param customKey Optional custom key to use instead of generating one
   * @returns The S3 key where the data was stored
   */
  async upload(payload: any, customKey?: string): Promise<string> {
    const key = customKey || `${this.prefix}${uuidv4()}.json`;

    return withErrorHandling(
      async () => {
        await this.s3.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: JSON.stringify(payload),
            ContentType: "application/json",
          }),
        );
        return key;
      },
      `Failed to upload to S3 (bucket: ${this.bucket}, key: ${key})`,
      S3OperationError,
      {
        operation: "upload",
        key,
        bucket: this.bucket,
      },
    );
  }

  /**
   * Download and parse a JSON payload from S3
   * @param key The S3 key to download
   * @param bucket Optional bucket override
   * @returns The parsed JSON payload
   */
  async download(key: string, bucket?: string): Promise<any> {
    const targetBucket = bucket || this.bucket;

    return withErrorHandling(
      async () => {
        const response = await this.s3.send(
          new GetObjectCommand({
            Bucket: targetBucket,
            Key: key,
          }),
        );

        const streamToString = (stream: Readable): Promise<string> =>
          new Promise((resolve, reject) => {
            const chunks: Uint8Array[] = [];
            stream.on("data", (chunk) => chunks.push(chunk));
            stream.on("error", reject);
            stream.on("end", () =>
              resolve(Buffer.concat(chunks).toString("utf-8")),
            );
          });

        return JSON.parse(await streamToString(response.Body as Readable));
      },
      `Failed to download from S3 (bucket: ${targetBucket}, key: ${key})`,
      S3OperationError,
      {
        operation: "download",
        key,
        bucket: targetBucket,
      },
    );
  }
}
