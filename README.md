# sqs-extended

[![NPM downloads](https://img.shields.io/npm/dm/sqs-extended.svg?style=flat)](https://npmjs.org/package/sqs-extended)
[![Build Status](https://github.com/bbc/sqs-extended/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/bbc/sqs-extended/actions/workflows/test.yml)

A lightweight wrapper around [sqs-consumer](https://github.com/bbc/sqs-consumer) and [sqs-producer](https://github.com/bbc/sqs-producer) that extends the functionality of the libraries to enable handling large SQS payloads by offloading message bodies to S3 automatically.

> **Note:** This package is currently in development and is not recommended for production use.

## Installation

To install this package, simply enter the following command into your terminal (or the variant of whatever package manager you are using):

```bash
npm install @bbc/sqs-extended
```

## Documentation

Visit [https://bbc.github.io/sqs-extended/](https://bbc.github.io/sqs-extended/) for the full API documentation.

## Usage

- It is recommended that you set up your S3 bucket with a lifecycle policy to automatically delete objects after a certain period of time to avoid incurring unnecessary storage costs.

### Credentials

By default the consumer will look for AWS credentials in the places [specified by the AWS SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html#Setting_AWS_Credentials). The simplest option is to export your credentials as environment variables:

```bash
export AWS_SECRET_ACCESS_KEY=...
export AWS_ACCESS_KEY_ID=...
```

If you need to specify your credentials manually, you can use a pre-configured instance of the [SQS Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-sqs/classes/sqsclient.html) client.

### AWS IAM Permissions

The consumer will receive and delete messages from the SQS queue. Ensure `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:DeleteMessageBatch`, `sqs:ChangeMessageVisibility` and `sqs:ChangeMessageVisibilityBatch` access is granted on the queue being consumed.

The producer will send messages to the SQS queue. Ensure `sqs:SendMessage` and `sqs:SendMessageBatch` access is granted on the queue being sent to.

And finally, the producer will upload messages to S3. Ensure `s3:PutObject` and `s3:GetObject` access is granted on the bucket being used.

### Producer

```typescript
import { SQSExtendedProducer } from "sqs-extended";

const producer = new SQSExtendedProducer({
  queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
  s3Bucket: "my-large-payload-bucket",
});

await producer.send({
  id: "my-message-id",
  body: largePayloadObject,
});
```

You can also read the full API documentation for the SQS Producer library that's used [here](https://bbc.github.io/sqs-producer/).

### Consumer

```typescript
import { SQSExtendedConsumer } from "sqs-extended";

const consumer = new SQSExtendedConsumer({
  queueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
  s3Bucket: "my-large-payload-bucket",
  handleMessage: async (message) => {
    console.log("Payload:", message.body);
  },
});

consumer.start();
```

You can also read the full API documentation for the SQS Consumer library that's used [here](https://bbc.github.io/sqs-consumer/).

## Contributing

We welcome and appreciate contributions for anyone who would like to take the time to fix a bug or implement a new feature.

But before you get started, [please read the contributing guidelines](https://github.com/bbc/sqs-extended/blob/main/.github/CONTRIBUTING.md) and [code of conduct](https://github.com/bbc/sqs-extended/blob/main/.github/CODE_OF_CONDUCT.md).

## License

SQS Extended is distributed under the Apache License, Version 2.0, see [LICENSE](https://github.com/bbc/sqs-extended/blob/main/LICENSE) for more information.
