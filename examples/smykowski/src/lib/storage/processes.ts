import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb'
import type {
  ProcessDefinition,
  ProcessRecord,
} from '~/lib/types/index.js'

/**
 * ProcessStorage manages process definitions for wiki-driven automation
 */
export class ProcessStorage {
  private docClient: DynamoDBDocumentClient
  private tableName: string

  constructor(tableName: string, region: string = 'us-east-1') {
    const client = new DynamoDBClient({ region })
    this.docClient = DynamoDBDocumentClient.from(client)
    this.tableName = tableName
  }

  /**
   * Save a process definition
   */
  async save(process: ProcessDefinition): Promise<void> {
    const record: ProcessRecord = {
      ...process,
      execution_count: 0,
      last_updated: new Date().toISOString(),
    }

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: record,
    }))
  }

  /**
   * Get a process by ID
   */
  async get(process_id: string): Promise<ProcessRecord | null> {
    const result = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { process_id },
    }))
    return result.Item as ProcessRecord || null
  }

  /**
   * Get all processes for a repository
   */
  async getByRepo(repo_id: string): Promise<ProcessRecord[]> {
    const result = await this.docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'repo_id-index',
      KeyConditionExpression: 'repo_id = :repo',
      ExpressionAttributeValues: { ':repo': repo_id },
    }))
    return result.Items as ProcessRecord[] || []
  }

  /**
   * Get processes for a specific event type
   */
  async getByEvent(repo_id: string, event: string): Promise<ProcessRecord[]> {
    const allProcesses = await this.getByRepo(repo_id)

    // Filter by event type and enabled status
    return allProcesses.filter(
      p => p.enabled && p.trigger.event === event
    )
  }

  /**
   * Update execution statistics for a process
   */
  async recordExecution(
    process_id: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    const status = success ? 'success' : error ? 'failed' : 'partial'

    await this.docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { process_id },
      UpdateExpression: `
        SET last_executed = :now,
            execution_count = execution_count + :inc,
            last_execution_status = :status,
            last_execution_error = :error
      `,
      ExpressionAttributeValues: {
        ':now': new Date().toISOString(),
        ':inc': 1,
        ':status': status,
        ':error': error || '',
      },
    }))
  }

  /**
   * Enable or disable a process
   */
  async setEnabled(process_id: string, enabled: boolean): Promise<void> {
    await this.docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { process_id },
      UpdateExpression: 'SET enabled = :enabled, last_updated = :now',
      ExpressionAttributeValues: {
        ':enabled': enabled,
        ':now': new Date().toISOString(),
      },
    }))
  }

  /**
   * Delete a process
   */
  async delete(process_id: string): Promise<void> {
    await this.docClient.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { process_id },
    }))
  }

  /**
   * Update a process definition (from wiki changes)
   */
  async update(process: ProcessDefinition): Promise<void> {
    const existing = await this.get(process.process_id)

    const record: ProcessRecord = {
      ...process,
      execution_count: existing?.execution_count || 0,
      last_executed: existing?.last_executed,
      last_execution_status: existing?.last_execution_status,
      last_execution_error: existing?.last_execution_error,
      last_updated: new Date().toISOString(),
    }

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: record,
    }))
  }

  /**
   * Get execution statistics for a process
   */
  async getExecutionStats(process_id: string): Promise<{
    execution_count: number
    last_executed?: string
    last_status?: string
    success_rate?: number
  }> {
    const process = await this.get(process_id)

    if (!process) {
      return { execution_count: 0 }
    }

    return {
      execution_count: process.execution_count,
      last_executed: process.last_executed,
      last_status: process.last_execution_status,
      // Note: For true success rate, we'd need to track successes separately
    }
  }

  /**
   * List all processes (for admin/debugging)
   */
  async listAll(): Promise<ProcessRecord[]> {
    const result = await this.docClient.send(new QueryCommand({
      TableName: this.tableName,
    }))
    return result.Items as ProcessRecord[] || []
  }
}
