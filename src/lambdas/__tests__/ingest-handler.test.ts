import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { mockClient } from 'aws-sdk-client-mock'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb'
import type { S3Event } from 'aws-lambda'

// Mock AWS clients
const s3Mock = mockClient(S3Client)
const lambdaMock = mockClient(LambdaClient)
const dynamoMock = mockClient(DynamoDBClient)

// Set environment variables
process.env.THREADS_TABLE = 'test-threads'
process.env.MESSAGES_TABLE = 'test-messages'
process.env.PROCESSED_BUCKET = 'test-processed'
process.env.PROCESSOR_FUNCTION = 'test-processor'
process.env.AWS_REGION = 'us-east-1'

// Import handler after env vars are set
import { handler } from '~/lambdas/ingest/handler.js'

// Helper to create mock S3 event
const createS3Event = (bucket: string, key: string): S3Event => ({
  Records: [
    {
      eventVersion: '2.1',
      eventSource: 'aws:s3',
      awsRegion: 'us-east-1',
      eventTime: '2025-01-15T10:00:00.000Z',
      eventName: 'ObjectCreated:Put',
      s3: {
        s3SchemaVersion: '1.0',
        configurationId: 'test-config',
        bucket: {
          name: bucket,
          ownerIdentity: { principalId: 'test' },
          arn: `arn:aws:s3:::${bucket}`,
        },
        object: {
          key,
          size: 1024,
          eTag: 'test-etag',
          sequencer: 'test-seq',
        },
      },
      userIdentity: { principalId: 'test' },
      requestParameters: { sourceIPAddress: '127.0.0.1' },
      responseElements: {
        'x-amz-request-id': 'test-request',
        'x-amz-id-2': 'test-id',
      },
    },
  ],
})

// Sample EML content
const sampleEML = `From: alice@example.com
To: bob@example.com
Subject: Test Email
Message-ID: <msg-001@example.com>
Date: Wed, 15 Jan 2025 10:00:00 +0000
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8

This is a test email body.
`

describe('Ingest Lambda Handler', () => {
  beforeEach(() => {
    s3Mock.reset()
    lambdaMock.reset()
    dynamoMock.reset()
  })

  it('should process S3 event and ingest email', async () => {
    const event = createS3Event('test-bucket', '2025/01/15/msg-001.eml')

    // Mock S3 GetObject
    s3Mock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: async () => sampleEML,
      } as any,
    })

    // Mock DynamoDB GetItem (thread doesn't exist)
    dynamoMock.on(GetItemCommand).resolves({})

    // Mock DynamoDB PutItem (for message and thread)
    dynamoMock.on(PutItemCommand).resolves({})

    // Mock Lambda Invoke
    lambdaMock.on(InvokeCommand).resolves({})

    // Execute handler
    await handler(event)

    // Verify S3 GetObject was called
    const getCalls = s3Mock.calls().filter(call => call.args[0] instanceof GetObjectCommand)
    expect(getCalls).toHaveLength(1)
    expect(getCalls[0].args[0].input.Bucket).toBe('test-bucket')
    expect(getCalls[0].args[0].input.Key).toBe('2025/01/15/msg-001.eml')

    // Verify DynamoDB PutItem was called (message + thread)
    const putCalls = dynamoMock.calls().filter(call => call.args[0] instanceof PutItemCommand)
    expect(putCalls.length).toBeGreaterThanOrEqual(2)

    // Verify Lambda Invoke was called with InvokeCommand
    const lambdaCalls = lambdaMock.calls().filter(call => call.args[0] instanceof InvokeCommand)
    expect(lambdaCalls).toHaveLength(1)

    // Just verify the command was sent - actual args verification would require
    // deeper inspection of the InvokeCommand internals
  })

  it('should update existing thread when message is part of thread', async () => {
    const event = createS3Event('test-bucket', '2025/01/15/msg-002.eml')

    // Mock S3 GetObject
    s3Mock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: async () => sampleEML,
      } as any,
    })

    // Mock DynamoDB GetItem (thread exists)
    dynamoMock.on(GetItemCommand).resolves({
      Item: {
        thread_id: { S: 'thread-001' },
        subject: { S: 'Test Thread' },
        message_count: { N: '1' },
      },
    })

    // Mock DynamoDB PutItem and UpdateItem
    dynamoMock.on(PutItemCommand).resolves({})
    dynamoMock.on(UpdateItemCommand).resolves({})

    // Mock Lambda Invoke
    lambdaMock.on(InvokeCommand).resolves({})

    await handler(event)

    // Verify UpdateItem was called for thread
    const updateCalls = dynamoMock.calls().filter(call => call.args[0] instanceof UpdateItemCommand)
    expect(updateCalls.length).toBeGreaterThanOrEqual(1)
  })

  it('should handle S3 errors gracefully', async () => {
    const event = createS3Event('test-bucket', 'missing.eml')

    // Mock S3 error
    s3Mock.on(GetObjectCommand).rejects(new Error('NoSuchKey'))

    // Should not throw - errors are logged and processing continues
    await expect(handler(event)).resolves.not.toThrow()

    // Lambda should not be invoked if S3 fetch fails
    expect(lambdaMock.calls()).toHaveLength(0)
  })

  it('should handle empty email body', async () => {
    const event = createS3Event('test-bucket', 'empty.eml')

    // Mock S3 with empty body
    s3Mock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: async () => '',
      } as any,
    })

    await expect(handler(event)).resolves.not.toThrow()

    // Should not proceed to DynamoDB or Lambda
    expect(dynamoMock.calls()).toHaveLength(0)
    expect(lambdaMock.calls()).toHaveLength(0)
  })

  it('should process multiple S3 records', async () => {
    const event: S3Event = {
      Records: [
        ...createS3Event('test-bucket', 'email1.eml').Records,
        ...createS3Event('test-bucket', 'email2.eml').Records,
      ],
    }

    // Mock S3 GetObject for both
    s3Mock.on(GetObjectCommand).resolves({
      Body: {
        transformToString: async () => sampleEML,
      } as any,
    })

    // Mock other services
    dynamoMock.on(GetItemCommand).resolves({})
    dynamoMock.on(PutItemCommand).resolves({})
    lambdaMock.on(InvokeCommand).resolves({})

    await handler(event)

    // Should have called S3 GetObject twice (and PutObject twice for processed emails)
    const getCalls = s3Mock.calls().filter(call => call.args[0] instanceof GetObjectCommand)
    expect(getCalls).toHaveLength(2)

    // Should have invoked processor twice
    expect(lambdaMock.calls()).toHaveLength(2)
  })

  it('should continue processing other records if one fails', async () => {
    const event: S3Event = {
      Records: [
        ...createS3Event('test-bucket', 'email1.eml').Records,
        ...createS3Event('test-bucket', 'bad-email.eml').Records,
        ...createS3Event('test-bucket', 'email3.eml').Records,
      ],
    }

    // First and third succeed, second fails
    s3Mock
      .on(GetObjectCommand, { Bucket: 'test-bucket', Key: 'email1.eml' })
      .resolves({
        Body: { transformToString: async () => sampleEML } as any,
      })
      .on(GetObjectCommand, { Bucket: 'test-bucket', Key: 'bad-email.eml' })
      .rejects(new Error('Corrupted'))
      .on(GetObjectCommand, { Bucket: 'test-bucket', Key: 'email3.eml' })
      .resolves({
        Body: { transformToString: async () => sampleEML } as any,
      })

    dynamoMock.on(GetItemCommand).resolves({})
    dynamoMock.on(PutItemCommand).resolves({})
    lambdaMock.on(InvokeCommand).resolves({})

    await handler(event)

    // Should have attempted GetObject for all three
    const getCalls = s3Mock.calls().filter(call => call.args[0] instanceof GetObjectCommand)
    expect(getCalls).toHaveLength(3)

    // Should have succeeded for 2 emails
    expect(lambdaMock.calls()).toHaveLength(2)
  })
})
