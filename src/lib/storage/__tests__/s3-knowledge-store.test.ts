import { describe, it, expect, beforeEach } from '@jest/globals'
import { mockClient } from 'aws-sdk-client-mock'
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { S3KnowledgeStore } from '~/lib/storage/s3-knowledge-store.js'

const s3Mock = mockClient(S3Client)

const createMockStream = (content: string) => {
  return {
    transformToString: async () => content
  }
}

describe('S3KnowledgeStore', () => {
  let store: S3KnowledgeStore
  const bucketName = 'test-knowledge-bucket'

  beforeEach(() => {
    s3Mock.reset()
    store = new S3KnowledgeStore(bucketName)
  })

  describe('putKnowledge', () => {
    it('should store knowledge content in S3', async () => {
      s3Mock.on(PutObjectCommand).resolves({})

      const key = await store.putKnowledge('entry-001', 'decision', '# Decision\\n\\nWe decided to use TypeScript')

      expect(key).toBe('decision/entry-001.md')
      expect(s3Mock.calls()).toHaveLength(1)
      const call = s3Mock.call(0)
      expect(call.args[0].input.Bucket).toBe(bucketName)
      expect(call.args[0].input.ContentType).toBe('text/markdown')
    })

    it('should handle different categories', async () => {
      s3Mock.on(PutObjectCommand).resolves({})

      const key = await store.putKnowledge('entry-002', 'commitment', 'Team committed')

      expect(key).toBe('commitment/entry-002.md')
    })

    it('should throw error on S3 failure', async () => {
      s3Mock.on(PutObjectCommand).rejects(new Error('S3 error'))

      await expect(store.putKnowledge('entry-003', 'decision', 'content')).rejects.toThrow('S3 error')
    })
  })

  describe('getKnowledge', () => {
    it('should retrieve knowledge content from S3', async () => {
      const content = '# Decision\\n\\nContent here'
      const mockStream = createMockStream(content)
      s3Mock.on(GetObjectCommand).resolves({ Body: mockStream })

      const result = await store.getKnowledge('entry-001', 'decision')

      expect(result).toBe(content)
      expect(s3Mock.calls()).toHaveLength(1)
    })

    it('should return null when entry not found', async () => {
      s3Mock.on(GetObjectCommand).rejects({ name: 'NoSuchKey' })

      const result = await store.getKnowledge('nonexistent', 'decision')

      expect(result).toBeNull()
    })

    it('should throw on other S3 errors', async () => {
      s3Mock.on(GetObjectCommand).rejects(new Error('S3 error'))

      await expect(store.getKnowledge('entry-001', 'decision')).rejects.toThrow('S3 error')
    })
  })

  describe('listKnowledgeByCategory', () => {
    it('should list knowledge entries by category', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({
        Contents: [
          { Key: 'decision/entry-001.md' },
          { Key: 'decision/entry-002.md' },
        ],
      })

      const results = await store.listKnowledgeByCategory('decision')

      expect(results).toHaveLength(2)
      expect(results[0].id).toBe('entry-001')
      expect(results[0].key).toBe('decision/entry-001.md')
      expect(results[1].id).toBe('entry-002')
    })

    it('should return empty array when no entries found', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({})

      const results = await store.listKnowledgeByCategory('empty')

      expect(results).toEqual([])
    })

    it('should use correct prefix for category', async () => {
      s3Mock.on(ListObjectsV2Command).resolves({ Contents: [] })

      await store.listKnowledgeByCategory('commitment')

      const call = s3Mock.call(0)
      expect(call.args[0].input.Prefix).toBe('commitment/')
    })
  })

  describe('deleteKnowledge', () => {
    it('should delete a knowledge entry from S3', async () => {
      s3Mock.on(DeleteObjectCommand).resolves({})

      await store.deleteKnowledge('entry-001', 'decision')

      expect(s3Mock.calls()).toHaveLength(1)
      const call = s3Mock.call(0)
      expect(call.args[0].input.Key).toBe('decision/entry-001.md')
    })

    it('should throw error on S3 failure', async () => {
      s3Mock.on(DeleteObjectCommand).rejects(new Error('S3 error'))

      await expect(store.deleteKnowledge('entry-001', 'decision')).rejects.toThrow('S3 error')
    })
  })
})
