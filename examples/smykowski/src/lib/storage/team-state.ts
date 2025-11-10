import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import type { TeamMember } from '~/lib/types/index.js'

export class TeamStateStorage {
  private docClient: DynamoDBDocumentClient
  private tableName: string

  constructor(tableName: string, region: string = 'us-east-1') {
    const client = new DynamoDBClient({ region })
    this.docClient = DynamoDBDocumentClient.from(client)
    this.tableName = tableName
  }

  async store(member: TeamMember): Promise<void> {
    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: member,
    }))
  }

  async get(email: string): Promise<TeamMember | null> {
    const result = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { email },
    }))
    return result.Item as TeamMember || null
  }

  async getAll(): Promise<TeamMember[]> {
    const result = await this.docClient.send(new ScanCommand({
      TableName: this.tableName,
    }))
    return result.Items as TeamMember[] || []
  }

  async updateWorkload(email: string, workload: number, assignedIssues: number[]): Promise<void> {
    await this.docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { email },
      UpdateExpression: 'SET current_workload = :workload, assigned_issues = :issues, updated_at = :now',
      ExpressionAttributeValues: {
        ':workload': workload,
        ':issues': assignedIssues,
        ':now': new Date().toISOString(),
      },
    }))
  }
}
