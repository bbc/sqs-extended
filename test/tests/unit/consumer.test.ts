import { describe, it, beforeEach, afterEach } from "mocha";
import { expect } from "chai";
import sinon from "sinon";
import { Consumer } from "sqs-consumer";

import { SQSExtendedConsumer } from "../../../src/consumer.js";
import { S3Handler } from "../../../src/handler.js";

describe("SQSExtendedConsumer", () => {
  let s3HandlerStub: sinon.SinonStubbedInstance<S3Handler>;
  let consumerStub: sinon.SinonStubbedInstance<Consumer>;
  let consumerCreateStub: sinon.SinonStub;
  let handleMessageStub: sinon.SinonStub;

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

    consumerStub = {
      start: sinon.stub(),
      stop: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<Consumer>;

    consumerCreateStub = sinon.stub(Consumer, "create").returns(consumerStub);
    handleMessageStub = sinon.stub().resolves();

    sinon.stub(S3Handler.prototype, "download").callsFake(async (key) => {
      return s3HandlerStub.download(key);
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("constructor", () => {
    it("should create consumer with correct options", () => {
      new SQSExtendedConsumer({
        queueUrl,
        s3Bucket,
        s3Prefix,
        handleMessage: handleMessageStub,
      });

      expect(consumerCreateStub.calledOnce).to.be.true;
      expect(consumerCreateStub.firstCall.args[0].queueUrl).to.equal(queueUrl);
      expect(
        typeof consumerCreateStub.firstCall.args[0].handleMessage,
      ).to.equal("function");
    });
  });

  describe("handleMessage", () => {
    let capturedHandleMessage: (message: any) => Promise<void>;

    beforeEach(() => {
      consumerCreateStub.callsFake((options) => {
        capturedHandleMessage = options.handleMessage;
        return consumerStub;
      });

      new SQSExtendedConsumer({
        queueUrl,
        s3Bucket,
        s3Prefix,
        handleMessage: handleMessageStub,
      });
    });

    it("should pass message directly if no s3Payload", async () => {
      const message = {
        MessageId: "test-id",
        Body: JSON.stringify({ test: "data" }),
      };

      await capturedHandleMessage(message);

      expect(handleMessageStub.calledOnce).to.be.true;
      expect(handleMessageStub.firstCall.args[0]).to.deep.equal({
        MessageId: "test-id",
        Body: JSON.stringify({ test: "data" }),
        body: { test: "data" },
      });

      expect(s3HandlerStub.download.called).to.be.false;
    });

    it("should download from S3 if message has s3Payload", async () => {
      const s3Key = "test-key";
      const fullPayload = { test: "full data" };
      const message = {
        MessageId: "test-id",
        Body: JSON.stringify({
          s3Payload: {
            bucket: s3Bucket,
            key: s3Key,
          },
        }),
      };

      s3HandlerStub.download.resolves(fullPayload);

      await capturedHandleMessage(message);

      expect(s3HandlerStub.download.calledOnce).to.be.true;
      expect(s3HandlerStub.download.firstCall.args[0]).to.equal(s3Key);

      expect(handleMessageStub.calledOnce).to.be.true;
      expect(handleMessageStub.firstCall.args[0]).to.deep.equal({
        MessageId: "test-id",
        Body: JSON.stringify({
          s3Payload: {
            bucket: s3Bucket,
            key: s3Key,
          },
        }),
        body: fullPayload,
      });
    });

    it("should handle invalid JSON in message body", async () => {
      const message = {
        MessageId: "test-id",
        Body: "not-json",
      };

      await capturedHandleMessage(message);

      expect(handleMessageStub.calledOnce).to.be.true;
      expect(handleMessageStub.firstCall.args[0]).to.deep.equal({
        MessageId: "test-id",
        Body: "not-json",
        body: {},
      });
    });

    it("should handle errors from S3Handler.download", async () => {
      const s3Key = "test-key";
      const error = new Error("Download failed");
      const message = {
        MessageId: "test-id",
        Body: JSON.stringify({
          s3Payload: {
            bucket: s3Bucket,
            key: s3Key,
          },
        }),
      };

      s3HandlerStub.download.rejects(error);

      try {
        await capturedHandleMessage(message);
        expect.fail("Should have thrown an error");
      } catch (err) {
        expect(err).to.equal(error);
      }

      expect(handleMessageStub.called).to.be.false;
    });
  });

  describe("start/stop", () => {
    let consumer: SQSExtendedConsumer;

    beforeEach(() => {
      consumer = new SQSExtendedConsumer({
        queueUrl,
        s3Bucket,
        handleMessage: handleMessageStub,
      });

      // @ts-ignore
      consumer.consumer = consumerStub;
    });

    it("should call consumer.start()", () => {
      consumer.start();
      expect(consumerStub.start.calledOnce).to.be.true;
    });

    it("should call consumer.stop()", () => {
      consumer.stop();
      expect(consumerStub.stop.calledOnce).to.be.true;
    });
  });
});
