import { describe, it, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { Producer } from "sqs-producer";
import { S3Client } from "@aws-sdk/client-s3";

import { SQSExtendedProducer } from "../../../src/producer.js";
import { S3Handler } from "../../../src/handler.js";

describe("SQSExtendedProducer", () => {
  let s3HandlerStub: sinon.SinonStubbedInstance<S3Handler>;
  let producerStub: sinon.SinonStubbedInstance<Producer>;
  let producerCreateStub: sinon.SinonStub;
  const queueUrl =
    "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue";
  const s3Bucket = "test-bucket";
  const s3Prefix = "test-prefix/";

  beforeEach(() => {
    s3HandlerStub = {
      upload: sinon.stub(),
      download: sinon.stub(),
      delete: sinon.stub(),
      bucket: s3Bucket,
      prefix: s3Prefix,
    } as unknown as sinon.SinonStubbedInstance<S3Handler>;

    producerStub = {
      send: sinon.stub().resolves({}),
    } as unknown as sinon.SinonStubbedInstance<Producer>;

    producerCreateStub = sinon.stub(Producer, "create").returns(producerStub);

    sinon.stub(S3Client.prototype);
    sinon.stub(S3Handler.prototype, "upload").callsFake(async (payload) => {
      return s3HandlerStub.upload(payload);
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("constructor", () => {
    it("should create producer with correct options", () => {
      new SQSExtendedProducer({
        queueUrl,
        s3Bucket,
        s3Prefix,
        sizeThreshold: 1024,
      });

      expect(producerCreateStub.calledOnce).to.be.true;
      expect(producerCreateStub.firstCall.args[0]).to.deep.equal({
        queueUrl,
      });
    });

    it("should use default size threshold if not provided", () => {
      const producer = new SQSExtendedProducer({ queueUrl, s3Bucket });
      // @ts-ignore
      expect(producer.sizeThreshold).to.equal(262144);
    });
  });

  describe("send", () => {
    let producer: SQSExtendedProducer;

    beforeEach(() => {
      producer = new SQSExtendedProducer({ queueUrl, s3Bucket });
      // @ts-ignore
      producer.producer = producerStub;
      // @ts-ignore
      producer.s3Handler = s3HandlerStub;
    });

    it("should send message directly if under the size threshold", async () => {
      const message = {
        id: "test-id",
        body: { test: "data" },
      };

      await producer.send(message);

      expect(producerStub.send.calledOnce).to.be.true;
      expect(producerStub.send.firstCall.args[0]).to.deep.equal(message);
      expect(s3HandlerStub.upload.called).to.be.false;
    });

    it("should upload to S3 if message exceeds size threshold", async () => {
      const largeMessage = {
        id: "test-id",
        body: { test: "a".repeat(300000) },
      };

      const s3Key = "test-key";
      s3HandlerStub.upload.resolves(s3Key);

      await producer.send(largeMessage);

      expect(s3HandlerStub.upload.calledOnce).to.be.true;
      expect(s3HandlerStub.upload.firstCall.args[0]).to.deep.equal(
        largeMessage.body,
      );

      expect(producerStub.send.calledOnce).to.be.true;
      expect(producerStub.send.firstCall.args[0]).to.deep.equal({
        id: "test-id",
        body: {
          s3Payload: {
            bucket: s3Bucket,
            key: s3Key,
          },
        },
      });
    });

    it("should respect custom size threshold", async () => {
      producer = new SQSExtendedProducer({
        queueUrl,
        s3Bucket,
        sizeThreshold: 50,
      });
      // @ts-ignore
      producer.producer = producerStub;
      // @ts-ignore
      producer.s3Handler = s3HandlerStub;

      const message = {
        id: "test-id",
        body: { test: "data that exceeds 50 bytes when stringified" },
      };

      const s3Key = "test-key";
      s3HandlerStub.upload.resolves(s3Key);

      await producer.send(message);

      expect(s3HandlerStub.upload.calledOnce).to.be.true;
    });

    it("should propagate errors from producer.send", async () => {
      const error = new Error("Send failed");
      producerStub.send.rejects(error);

      try {
        await producer.send({ id: "test-id", body: { test: "data" } });
        expect.fail("Should have thrown an error");
      } catch (err) {
        expect(err).to.equal(error);
      }
    });

    it("should propagate errors from s3Handler.upload", async () => {
      const error = new Error("Upload failed");
      s3HandlerStub.upload.rejects(error);

      const largeMessage = {
        id: "test-id",
        body: { test: "a".repeat(300000) },
      };

      try {
        await producer.send(largeMessage);
        expect.fail("Should have thrown an error");
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });
});
