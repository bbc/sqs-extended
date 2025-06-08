import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

export class S3Handler {
  private s3: S3Client;
  private bucket: string;
  private prefix: string;

  constructor(s3: S3Client, bucket: string, prefix = '') {
    this.s3 = s3;
    this.bucket = bucket;
    this.prefix = prefix;
  }

  async upload(payload: any): Promise<string> {
    const key = `${this.prefix}${uuidv4()}.json`;
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: 'application/json'
    }));
    return key;
  }

  async download(key: string): Promise<any> {
    const response = await this.s3.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    }));

    const streamToString = (stream: Readable): Promise<string> => new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });

    return JSON.parse(await streamToString(response.Body as Readable));
  }

  async delete(key: string) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}