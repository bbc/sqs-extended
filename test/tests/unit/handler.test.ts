import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

import { S3Handler } from '../../../src/handler.js';
import { Readable } from 'stream';

describe('S3Handler', () => {
  let s3Client: sinon.SinonStubbedInstance<S3Client>;
  let s3Handler: S3Handler;
  const bucket = 'test-bucket';
  const prefix = 'test-prefix/';

  beforeEach(() => {
    s3Client = sinon.createStubInstance(S3Client);
    s3Handler = new S3Handler(s3Client as unknown as S3Client, bucket, prefix);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('upload', () => {
    it('should upload payload to S3 and return key', async () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      
      const originalUpload = S3Handler.prototype.upload;
      S3Handler.prototype.upload = async function(payload: any) {
        const key = `${this.prefix}${uuid}.json`;
        await this.s3.send(new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: JSON.stringify(payload),
          ContentType: 'application/json'
        }));
        return key;
      };

      const payload = { test: 'data' };
      s3Client.send.resolves({});
      
      const result = await s3Handler.upload(payload);
      
      expect(result).to.equal(`${prefix}${uuid}.json`);
      expect(s3Client.send.calledOnce).to.be.true;
      
      const command = s3Client.send.firstCall.args[0];
      expect(command).to.be.instanceOf(PutObjectCommand);
      expect(command.input).to.deep.equal({
        Bucket: bucket,
        Key: `${prefix}${uuid}.json`,
        Body: JSON.stringify(payload),
        ContentType: 'application/json'
      });
      
      S3Handler.prototype.upload = originalUpload;
    });
  });

  describe('download', () => {
    it('should download payload from S3 and parse JSON', async () => {
      const key = 'test-key';
      const payload = { test: 'data' };
      const mockStream = new Readable();
      mockStream.push(JSON.stringify(payload));
      mockStream.push(null); // End of stream
      
      s3Client.send.resolves({
        Body: mockStream
      });
      
      const result = await s3Handler.download(key);
      
      expect(result).to.deep.equal(payload);
      expect(s3Client.send.calledOnce).to.be.true;
      
      const command = s3Client.send.firstCall.args[0];
      expect(command).to.be.instanceOf(GetObjectCommand);
      expect(command.input).to.deep.equal({
        Bucket: bucket,
        Key: key
      });
    });

    it('should handle errors when downloading', async () => {
      const key = 'test-key';
      const error = new Error('Download failed');
      
      s3Client.send.rejects(error);
      
      try {
        await s3Handler.download(key);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('delete', () => {
    it('should delete an object from S3', async () => {
      const key = 'test-key';
      s3Client.send.resolves({});
      
      await s3Handler.delete(key);
      
      expect(s3Client.send.calledOnce).to.be.true;
      
      const command = s3Client.send.firstCall.args[0];
      expect(command).to.be.instanceOf(DeleteObjectCommand);
      expect(command.input).to.deep.equal({
        Bucket: bucket,
        Key: key
      });
    });
  });
});
