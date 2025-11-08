/**
 * S3 implementation of email store
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import type { IEmailStore } from './interfaces'

export class S3EmailStore implements IEmailStore {
  private client: S3Client
  private rawBucket: string
  private processedBucket: string

  constructor(rawBucket: string, processedBucket: string, region = 'us-east-1') {
    this.client = new S3Client({ region })
    this.rawBucket = rawBucket
    this.processedBucket = processedBucket
  }

  async putRawEmail(messageId: string, content: string): Promise<string> {
    // Store with date-based prefix for organization
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const day = String(now.getUTCDate()).padStart(2, '0')
    const key = `${year}/${month}/${day}/${messageId}.eml`

    const command = new PutObjectCommand({
      Bucket: this.rawBucket,
      Key: key,
      Body: content,
      ContentType: 'message/rfc822',
    })

    await this.client.send(command)
    return key
  }

  async getRawEmail(key: string): Promise<string | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.rawBucket,
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

  async putProcessedEmail(threadId: string, messageId: string, content: string): Promise<string> {
    const key = `${threadId}/${messageId}.json`

    const command = new PutObjectCommand({
      Bucket: this.processedBucket,
      Key: key,
      Body: content,
      ContentType: 'application/json',
    })

    await this.client.send(command)
    return key
  }

  async getProcessedEmail(key: string): Promise<string | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.processedBucket,
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
}
