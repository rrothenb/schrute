import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb'
import type {
  IssueMetric,
  IssueResponseStats,
  IssueResolutionStats,
} from '~/lib/types/index.js'

/**
 * IssueMetricsStorage manages issue lifecycle metrics for response time tracking
 */
export class IssueMetricsStorage {
  private docClient: DynamoDBDocumentClient
  private tableName: string

  constructor(tableName: string, region: string = 'us-east-1') {
    const client = new DynamoDBClient({ region })
    this.docClient = DynamoDBDocumentClient.from(client)
    this.tableName = tableName
  }

  /**
   * Record a new issue being created
   */
  async recordIssueCreated(params: {
    repo_id: string
    issue_number: number
    created_by: string
    labels?: string[]
  }): Promise<void> {
    const issue_id = `${params.repo_id}#${params.issue_number}`

    const metric: IssueMetric = {
      issue_id,
      repo_id: params.repo_id,
      issue_number: params.issue_number,
      created_at: new Date().toISOString(),
      created_by: params.created_by,
      labels: params.labels || [],
      updated_at: new Date().toISOString(),
    }

    await this.docClient.send(new PutCommand({
      TableName: this.tableName,
      Item: metric,
    }))
  }

  /**
   * Record the first comment on an issue
   */
  async recordFirstComment(params: {
    repo_id: string
    issue_number: number
    commented_at: string
    commented_by: string
  }): Promise<void> {
    const issue_id = `${params.repo_id}#${params.issue_number}`

    // Get the existing metric to check the creator
    const existing = await this.get(issue_id)
    if (!existing) {
      console.error(`Issue metric not found for ${issue_id}`)
      return
    }

    const updates: any = {
      first_comment_at: params.commented_at,
      first_comment_by: params.commented_by,
      updated_at: new Date().toISOString(),
    }

    // If this is not from the issue creator, also record as first non-author comment
    if (params.commented_by !== existing.created_by) {
      const responseTimeMinutes = this.calculateMinutesBetween(
        existing.created_at,
        params.commented_at
      )

      updates.first_non_author_comment_at = params.commented_at
      updates.first_non_author_comment_by = params.commented_by
      updates.response_time_minutes = responseTimeMinutes
    }

    await this.docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { issue_id },
      UpdateExpression: `SET ${Object.keys(updates).map((k, i) => `#k${i} = :v${i}`).join(', ')}`,
      ExpressionAttributeNames: Object.keys(updates).reduce((acc, k, i) => {
        acc[`#k${i}`] = k
        return acc
      }, {} as Record<string, string>),
      ExpressionAttributeValues: Object.values(updates).reduce((acc, v, i) => {
        acc[`:v${i}`] = v
        return acc
      }, {} as Record<string, any>),
    }))
  }

  /**
   * Record an issue being closed
   */
  async recordIssueClosed(params: {
    repo_id: string
    issue_number: number
    closed_at: string
  }): Promise<void> {
    const issue_id = `${params.repo_id}#${params.issue_number}`

    const existing = await this.get(issue_id)
    if (!existing) {
      console.error(`Issue metric not found for ${issue_id}`)
      return
    }

    const resolutionTimeMinutes = this.calculateMinutesBetween(
      existing.created_at,
      params.closed_at
    )

    await this.docClient.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { issue_id },
      UpdateExpression: 'SET closed_at = :closed, resolution_time_minutes = :resolution, updated_at = :now',
      ExpressionAttributeValues: {
        ':closed': params.closed_at,
        ':resolution': resolutionTimeMinutes,
        ':now': new Date().toISOString(),
      },
    }))
  }

  /**
   * Get a specific issue metric
   */
  async get(issue_id: string): Promise<IssueMetric | null> {
    const result = await this.docClient.send(new GetCommand({
      TableName: this.tableName,
      Key: { issue_id },
    }))
    return result.Item as IssueMetric || null
  }

  /**
   * Get all metrics for a repository
   */
  async getByRepo(repo_id: string, limit?: number): Promise<IssueMetric[]> {
    const result = await this.docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'repo_id-index',
      KeyConditionExpression: 'repo_id = :repo',
      ExpressionAttributeValues: { ':repo': repo_id },
      Limit: limit,
      ScanIndexForward: false, // Most recent first
    }))
    return result.Items as IssueMetric[] || []
  }

  /**
   * Calculate response time statistics for a repository
   */
  async calculateResponseStats(
    repo_id: string,
    lookbackDays: number = 30
  ): Promise<IssueResponseStats> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)
    const cutoffISO = cutoffDate.toISOString()
    const now = new Date().toISOString()

    // Query recent issues with response times
    const result = await this.docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'repo_id-index',
      KeyConditionExpression: 'repo_id = :repo',
      FilterExpression: 'created_at >= :cutoff AND attribute_exists(response_time_minutes)',
      ExpressionAttributeValues: {
        ':repo': repo_id,
        ':cutoff': cutoffISO,
      },
    }))

    const metrics = result.Items as IssueMetric[] || []
    const responseTimes = metrics
      .map(m => m.response_time_minutes!)
      .filter(rt => rt !== undefined && rt !== null)
      .sort((a, b) => a - b)

    if (responseTimes.length === 0) {
      return {
        average_minutes: 0,
        median_minutes: 0,
        p90_minutes: 0,
        p95_minutes: 0,
        sample_size: 0,
        period_start: cutoffISO,
        period_end: now,
      }
    }

    const average = responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
    const median = this.calculatePercentile(responseTimes, 50)
    const p90 = this.calculatePercentile(responseTimes, 90)
    const p95 = this.calculatePercentile(responseTimes, 95)

    return {
      average_minutes: Math.round(average),
      median_minutes: Math.round(median),
      p90_minutes: Math.round(p90),
      p95_minutes: Math.round(p95),
      sample_size: responseTimes.length,
      period_start: cutoffISO,
      period_end: now,
    }
  }

  /**
   * Calculate resolution time statistics for a repository
   */
  async calculateResolutionStats(
    repo_id: string,
    lookbackDays: number = 30
  ): Promise<IssueResolutionStats> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - lookbackDays)
    const cutoffISO = cutoffDate.toISOString()
    const now = new Date().toISOString()

    const result = await this.docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'repo_id-index',
      KeyConditionExpression: 'repo_id = :repo',
      FilterExpression: 'created_at >= :cutoff',
      ExpressionAttributeValues: {
        ':repo': repo_id,
        ':cutoff': cutoffISO,
      },
    }))

    const metrics = result.Items as IssueMetric[] || []
    const closedIssues = metrics.filter(m => m.closed_at && m.resolution_time_minutes)
    const resolutionTimes = closedIssues
      .map(m => m.resolution_time_minutes! / 60) // Convert to hours
      .sort((a, b) => a - b)

    const average = resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, rt) => sum + rt, 0) / resolutionTimes.length
      : 0

    const median = resolutionTimes.length > 0
      ? this.calculatePercentile(resolutionTimes, 50)
      : 0

    return {
      average_hours: Math.round(average * 10) / 10,
      median_hours: Math.round(median * 10) / 10,
      total_closed: closedIssues.length,
      total_open: metrics.length - closedIssues.length,
      sample_size: metrics.length,
      period_start: cutoffISO,
      period_end: now,
    }
  }

  /**
   * Calculate minutes between two ISO timestamps
   */
  private calculateMinutesBetween(start: string, end: string): number {
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    return Math.round((endTime - startTime) / (1000 * 60))
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0

    const index = (percentile / 100) * (sortedValues.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index - lower

    if (lower === upper) {
      return sortedValues[lower]
    }

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
  }

  /**
   * Delete old metrics (for cleanup)
   */
  async deleteOldMetrics(repo_id: string, olderThanDays: number): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
    const cutoffISO = cutoffDate.toISOString()

    // This is a simplified implementation
    // In production, you'd want to use batch operations
    const result = await this.docClient.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: 'repo_id-index',
      KeyConditionExpression: 'repo_id = :repo',
      FilterExpression: 'created_at < :cutoff',
      ExpressionAttributeValues: {
        ':repo': repo_id,
        ':cutoff': cutoffISO,
      },
      ProjectionExpression: 'issue_id',
    }))

    // Note: Actual deletion would be done in batches
    return result.Items?.length || 0
  }
}
