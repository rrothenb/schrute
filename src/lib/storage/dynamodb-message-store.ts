/**
 * DynamoDB implementation of message store
 */

import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import type { IMessageStore } from './interfaces'
import type { Message } from '~/lib/types'

export class DynamoDBMessageStore implements IMessageStore {
  private client: DynamoDBClient
  private tableName: string

  constructor(tableName: string, region = 'us-east-1') {
    this.client = new DynamoDBClient({ region })
    this.tableName = tableName
  }

  async putMessage(message: Message): Promise<void> {
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(message, { removeUndefinedValues: true }),
    })

    await this.client.send(command)
  }

  async getMessage(messageId: string): Promise<Message | null> {
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({ message_id: messageId }),
    })

    const response = await this.client.send(command)

    if (!response.Item) {
      return null
    }

    return unmarshall(response.Item) as Message
  }

  async getMessagesByThread(threadId: string): Promise<Message[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'thread_id-timestamp-index',
      KeyConditionExpression: 'thread_id = :threadId',
      ExpressionAttributeValues: marshall({
        ':threadId': threadId,
      }),
      ScanIndexForward: true, // Sort ascending by timestamp
    })

    const response = await this.client.send(command)

    if (!response.Items || response.Items.length === 0) {
      return []
    }

    return response.Items.map((item) => unmarshall(item) as Message)
  }

  async getMessagesByThreadAndTimeRange(
    threadId: string,
    startTime: string,
    endTime: string
  ): Promise<Message[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'thread_id-timestamp-index',
      KeyConditionExpression: 'thread_id = :threadId AND #ts BETWEEN :start AND :end',
      ExpressionAttributeNames: {
        '#ts': 'timestamp',
      },
      ExpressionAttributeValues: marshall({
        ':threadId': threadId,
        ':start': startTime,
        ':end': endTime,
      }),
      ScanIndexForward: true,
    })

    const response = await this.client.send(command)

    if (!response.Items || response.Items.length === 0) {
      return []
    }

    return response.Items.map((item) => unmarshall(item) as Message)
  }
}
