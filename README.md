# sqs-extended

[![NPM downloads](https://img.shields.io/npm/dm/sqs-extended.svg?style=flat)](https://npmjs.org/package/sqs-extended)
[![Build Status](https://github.com/bbc/sqs-extended/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/bbc/sqs-extended/actions/workflows/test.yml)

A lightweight wrapper around [sqs-consumer](https://github.com/bbc/sqs-consumer) and [sqs-producer](https://github.com/bbc/sqs-producer) that extends the functionality of the libraries to enable handling large SQS payloads by offloading message bodies to S3 automatically.

## Installation

To install this package, simply enter the following command into your terminal (or the variant of whatever package manager you are using):

```bash
npm install sqs-extended
```

## Documentation

Visit [https://bbc.github.io/sqs-extended/](https://bbc.github.io/sqs-extended/) for the full API documentation.

## Usage

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

## Contributing

We welcome and appreciate contributions for anyone who would like to take the time to fix a bug or implement a new feature.

But before you get started, [please read the contributing guidelines](https://github.com/bbc/sqs-extended/blob/main/.github/CONTRIBUTING.md) and [code of conduct](https://github.com/bbc/sqs-extended/blob/main/.github/CODE_OF_CONDUCT.md).

## License

SQS Extended is distributed under the Apache License, Version 2.0, see [LICENSE](https://github.com/bbc/sqs-extended/blob/main/LICENSE) for more information.
