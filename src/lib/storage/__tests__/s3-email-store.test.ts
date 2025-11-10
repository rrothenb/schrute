import { describe, it, expect, beforeEach } from '@jest/globals'
import { mockClient } from 'aws-sdk-client-mock'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { S3EmailStore } from '~/lib/storage/s3-email-store.js'
import type { Email } from '~/lib/types/index.js'
import { Readable } from 'stream'

const s3Mock = mockClient(S3Client)

// Helper to create mock stream
const createMockStream = (content: string) => {
  return {
    transformToString: async () => content
  }
}

describe('S3EmailStore', () => {
  let store: S3EmailStore
  const rawBucket = 'test-raw-bucket'
  const processedBucket = 'test-processed-bucket'

  beforeEach(() => {
    s3Mock.reset()
    store = new S3EmailStore(rawBucket, processedBucket)
  })

  describe('putRawEmail', () => {
    it('should store raw email content in S3', async () => {
      const rawContent = 'From: alice@example.com\\r\\nTo: bob@example.com\\r\\n\\r\\nTest body'

      s3Mock.on(PutObjectCommand).resolves({})

      const key = await store.putRawEmail('msg-001', rawContent)

      expect(key).toContain('.eml')
      expect(key).toContain('msg-001')
      expect(s3Mock.calls()).toHaveLength(1)
      const call = s3Mock.call(0)
      expect(call.args[0].input.Bucket).toBe(rawBucket)
      expect(call.args[0].input.ContentType).toBe('message/rfc822')
    })

    it('should use date-based prefix for organization', async () => {
      s3Mock.on(PutObjectCommand).resolves({})

      const key = await store.putRawEmail('msg-002', 'test content')

      // Key should have format: YYYY/MM/DD/message_id.eml
      expect(key).toMatch(/^\\d{4}\\/\\d{2}\\/\\d{2}\\/msg-002\\.eml$/)
    })

    it('should throw error on S3 failure', async () => {
      s3Mock.on(PutObjectCommand).rejects(new Error('S3 error'))

      await expect(store.putRawEmail('msg-003', 'test')).rejects.toThrow('S3 error')
    })
  })

  describe('getRawEmail', () => {
    it('should retrieve raw email from S3', async () => {
      const rawContent = 'From: alice@example.com\\r\\nTo: bob@example.com\\r\\n\\r\\nTest body'
      const mockStream = createMockStream(rawContent)

      s3Mock.on(GetObjectCommand).resolves({ Body: mockStream })

      const result = await store.getRawEmail('2025/01/15/msg-001.eml')

      expect(result).toBe(rawContent)
      expect(s3Mock.calls()).toHaveLength(1)
    })

    it('should return null when email not found', async () => {
      s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' })

      const result = await store.getRawEmail('nonexistent.eml')

      expect(result).toBeNull()
    })

    it('should throw on other S3 errors', async () => {
      s3Mock.on(GetObjectCommand).rejects(new Error('S3 error'))

      await expect(store.getRawEmail('test.eml')).rejects.toThrow('S3 error')
    })
  })

  describe('putProcessedEmail', () => {
    it('should store processed email as JSON in S3', async () => {
      const email: Email = {
        message_id: 'msg-001',
        thread_id: 'thread-001',
        from: { email: 'alice@example.com', name: 'Alice' },
        to: [{ email: 'bob@example.com', name: 'Bob' }],
        cc: [],
        subject: 'Test Subject',
        body: 'Test body',
        timestamp: '2025-01-15T10:00:00Z',
      }

      s3Mock.on(PutObjectCommand).resolves({})

      const key = await store.putProcessedEmail(email)

      expect(key).toContain('.json')
      expect(key).toContain('msg-001')
      expect(s3Mock.calls()).toHaveLength(1)
      const call = s3Mock.call(0)
      expect(call.args[0].input.Bucket).toBe(processedBucket)
      expect(call.args[0].input.ContentType).toBe('application/json')
    })

    it('should handle emails with all optional fields', async () => {
      const email: Email = {
        message_id: 'msg-002',
        thread_id: 'thread-002',
        from: { email: 'alice@example.com', name: 'Alice' },
        to: [{ email: 'bob@example.com', name: 'Bob' }],
        cc: [{ email: 'charlie@example.com', name: 'Charlie' }],
        subject: 'Test',
        body: 'Body',
        timestamp: '2025-01-15T11:00:00Z',
        in_reply_to: 'msg-001',
      }

      s3Mock.on(PutObjectCommand).resolves({})

      await store.putProcessedEmail(email)

      expect(s3Mock.calls()).toHaveLength(1)
    })
  })

  describe('getProcessedEmail', () => {
    it('should retrieve processed email from S3', async () => {
      const email: Email = {
        message_id: 'msg-001',
        thread_id: 'thread-001',
        from: { email: 'alice@example.com', name: 'Alice' },
        to: [{ email: 'bob@example.com', name: 'Bob' }],
        cc: [],
        subject: 'Test',
        body: 'Body',
        timestamp: '2025-01-15T10:00:00Z',
      }

      const mockStream = createMockStream(JSON.stringify(email))
      s3Mock.on(GetObjectCommand).resolves({ Body: mockStream })

      const result = await store.getProcessedEmail('2025/01/15/msg-001.json')

      expect(result).toEqual(email)
      expect(s3Mock.calls()).toHaveLength(1)
    })

    it('should return null when email not found', async () => {
      s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' })

      const result = await store.getProcessedEmail('nonexistent.json')

      expect(result).toBeNull()
    })

    it('should handle malformed JSON', async () => {
      const mockStream = createMockStream('invalid json')
      s3Mock.on(GetObjectCommand).resolves({ Body: mockStream })

      await expect(store.getProcessedEmail('bad.json')).rejects.toThrow()
    })
  })
})
