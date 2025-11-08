/**
 * DynamoDB implementation of activation log store
 */

import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb'
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb'
import type { IActivationLogStore, ActivationLog } from './interfaces'

export class DynamoDBActivationLogStore implements IActivationLogStore {
  private client: DynamoDBClient
  private tableName: string

  constructor(tableName: string, region = 'us-east-1') {
    this.client = new DynamoDBClient({ region })
    this.tableName = tableName
  }

  async logActivation(log: ActivationLog): Promise<void> {
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(log, { removeUndefinedValues: true }),
    })

    await this.client.send(command)
  }

  async getActivationLogsByThread(threadId: string): Promise<ActivationLog[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'thread_id-timestamp-index',
      KeyConditionExpression: 'thread_id = :threadId',
      ExpressionAttributeValues: marshall({
        ':threadId': threadId,
      }),
      ScanIndexForward: false, // Most recent first
    })

    const response = await this.client.send(command)

    if (!response.Items || response.Items.length === 0) {
      return []
    }

    return response.Items.map((item) => unmarshall(item) as ActivationLog)
  }
}
