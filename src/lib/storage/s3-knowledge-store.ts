/**
 * S3 implementation of knowledge store
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import type { IKnowledgeStore } from './interfaces'

export class S3KnowledgeStore implements IKnowledgeStore {
  private client: S3Client
  private bucket: string

  constructor(bucket: string, region = 'us-east-1') {
    this.client = new S3Client({ region })
    this.bucket = bucket
  }

  async putKnowledge(id: string, category: string, content: string): Promise<string> {
    const key = `${category}/${id}.md`

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: content,
      ContentType: 'text/markdown',
    })

    await this.client.send(command)
    return key
  }

  async getKnowledge(id: string, category: string): Promise<string | null> {
    const key = `${category}/${id}.md`

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })

      const response = await this.client.send(command)
      const body = await response.Body?.transformToString()
      return body || null
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        return null
      }
      throw error
    }
  }

  async listKnowledgeByCategory(category: string): Promise<Array<{ id: string; key: string }>> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: `${category}/`,
    })

    const response = await this.client.send(command)

    if (!response.Contents || response.Contents.length === 0) {
      return []
    }

    return response.Contents.filter((item) => item.Key).map((item) => {
      const key = item.Key!
      const id = key.split('/').pop()?.replace('.md', '') || ''
      return { id, key }
    })
  }

  async deleteKnowledge(id: string, category: string): Promise<void> {
    const key = `${category}/${id}.md`

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    })

    await this.client.send(command)
  }
}
