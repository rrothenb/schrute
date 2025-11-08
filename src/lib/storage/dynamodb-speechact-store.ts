/**
 * DynamoDB implementation of speech act store
 */

import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import type { ISpeechActStore } from './interfaces'
import type { SpeechAct } from '~/lib/types'

export class DynamoDBSpeechActStore implements ISpeechActStore {
  private client: DynamoDBClient
  private tableName: string

  constructor(tableName: string, region = 'us-east-1') {
    this.client = new DynamoDBClient({ region })
    this.tableName = tableName
  }

  async putSpeechAct(act: SpeechAct): Promise<void> {
    // Convert SpeechAct to a format suitable for DynamoDB
    const item = {
      act_id: act.id,
      type: act.type,
      content: act.content,
      from_email: act.actor.email,
      from_name: act.actor.name,
      participants: act.participants.map((p) => p.email),
      confidence: act.confidence,
      source_message_id: act.source_message_id,
      thread_id: act.thread_id,
      timestamp: act.timestamp,
      metadata: act.metadata || {},
    }

    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(item, { removeUndefinedValues: true }),
    })

    await this.client.send(command)
  }

  async getSpeechActsByThread(threadId: string): Promise<SpeechAct[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'thread_id-timestamp-index',
      KeyConditionExpression: 'thread_id = :threadId',
      ExpressionAttributeValues: marshall({
        ':threadId': threadId,
      }),
      ScanIndexForward: true, // Sort by timestamp ascending
    })

    const response = await this.client.send(command)

    if (!response.Items || response.Items.length === 0) {
      return []
    }

    return response.Items.map((item) => this.itemToSpeechAct(unmarshall(item)))
  }

  async getSpeechActsByType(type: string): Promise<SpeechAct[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'type-timestamp-index',
      KeyConditionExpression: '#type = :type',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: marshall({
        ':type': type,
      }),
      ScanIndexForward: false, // Most recent first
    })

    const response = await this.client.send(command)

    if (!response.Items || response.Items.length === 0) {
      return []
    }

    return response.Items.map((item) => this.itemToSpeechAct(unmarshall(item)))
  }

  async getAllSpeechActs(): Promise<SpeechAct[]> {
    const command = new ScanCommand({
      TableName: this.tableName,
    })

    const response = await this.client.send(command)

    if (!response.Items || response.Items.length === 0) {
      return []
    }

    return response.Items.map((item) => this.itemToSpeechAct(unmarshall(item)))
  }

  /**
   * Convert DynamoDB item to SpeechAct type
   */
  private itemToSpeechAct(item: Record<string, unknown>): SpeechAct {
    return {
      id: item.act_id as string,
      type: item.type as any,
      content: item.content as string,
      actor: {
        email: item.from_email as string,
        name: item.from_name as string | undefined,
      },
      participants: (item.participants as string[]).map((email) => ({
        email,
      })),
      confidence: item.confidence as number,
      source_message_id: item.source_message_id as string,
      thread_id: item.thread_id as string,
      timestamp: item.timestamp as string,
      metadata: (item.metadata as Record<string, unknown>) || {},
    }
  }
}
