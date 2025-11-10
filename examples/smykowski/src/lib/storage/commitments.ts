import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { Commitment } from '~/lib/types/index.js'

export class CommitmentsStorage {
  private docClient: DynamoDBDocumentClient
  private tableName: string

  constructor(tableName: string, region: string = 'us-east-1') {
    const client = new DynamoDBClient({ region })
    this.docClient = DynamoDBDocumentClient.from(client)
    this.tableName = tableName
  }

  async store(commitment: Commitment): Promise<void> {
    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: commitment,
    }))
  }

  async get(id: string): Promise<Commitment | null> {
    const result = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { id },
    }))
    return result.Item as Commitment || null
  }

  async getByPerson(email: string): Promise<Commitment[]> {
    const result = await this.docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'person_email-index',
      KeyConditionExpression: 'person_email = :email',
      ExpressionAttributeValues: { ':email': email },
    }))
    return result.Items as Commitment[] || []
  }

  async updateStatus(id: string, status: Commitment['status']): Promise<void> {
    await this.docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: 'SET #status = :status, updated_at = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': status,
        ':now': new Date().toISOString(),
      },
    }))
  }
}
