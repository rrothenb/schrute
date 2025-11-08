/**
 * DynamoDB implementation of thread store
 */

import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import type { IThreadStore } from './interfaces'
import type { Thread } from '~/lib/types'

export class DynamoDBThreadStore implements IThreadStore {
  private client: DynamoDBClient
  private tableName: string

  constructor(tableName: string, region = 'us-east-1') {
    this.client = new DynamoDBClient({ region })
    this.tableName = tableName
  }

  async putThread(thread: Thread): Promise<void> {
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(thread, { removeUndefinedValues: true }),
    })

    await this.client.send(command)
  }

  async getThread(threadId: string): Promise<Thread | null> {
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({ thread_id: threadId }),
    })

    const response = await this.client.send(command)

    if (!response.Item) {
      return null
    }

    return unmarshall(response.Item) as Thread
  }

  async updateThreadParticipants(threadId: string, newParticipants: string[]): Promise<void> {
    // Use ADD to add new participants to the set
    // Note: DynamoDB will handle deduplication automatically with sets
    const command = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({ thread_id: threadId }),
      UpdateExpression: 'ADD participants :newParticipants SET updated_at = :updatedAt',
      ExpressionAttributeValues: marshall({
        ':newParticipants': new Set(newParticipants),
        ':updatedAt': new Date().toISOString(),
      }),
    })

    await this.client.send(command)
  }

  async updateThreadLastMessage(
    threadId: string,
    messageId: string,
    timestamp: string
  ): Promise<void> {
    const command = new UpdateItemCommand({
      TableName: this.tableName,
      Key: marshall({ thread_id: threadId }),
      UpdateExpression:
        'SET last_message_id = :messageId, updated_at = :timestamp ADD message_count :inc',
      ExpressionAttributeValues: marshall({
        ':messageId': messageId,
        ':timestamp': timestamp,
        ':inc': 1,
      }),
    })

    await this.client.send(command)
  }
}
