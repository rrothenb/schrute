import { describe, it, expect, beforeEach } from '@jest/globals'
import { IssueManager } from '~/lib/github/issues.js'
import { createMockGitHubClient, mockIssues } from '../../mocks/github-api.js'
import type { GitHubClient } from '~/lib/github/client.js'

describe('IssueManager', () => {
  let mockClient: any
  let manager: IssueManager

  beforeEach(() => {
    const mockGitHub = createMockGitHubClient()
    mockClient = {
      getOwner: () => 'test',
      getRepo: () => 'repo',
      getFullName: () => 'test/repo',
      getOctokit: () => ({
        rest: mockGitHub,
      }),
    } as unknown as GitHubClient

    manager = new IssueManager(mockClient)
  })

  describe('create', () => {
    it('should create an issue with all fields', async () => {
      const issue = await manager.create({
        title: 'Test Issue',
        body: 'Test body',
        assignees: ['alice'],
        labels: ['bug'],
      })

      expect(issue.title).toBe('Implement authentication flow')
      expect(mockClient.getOctokit().issues.create).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test',
          repo: 'repo',
          title: 'Test Issue',
          body: 'Test body',
          assignees: ['alice'],
          labels: ['bug'],
        })
      )
    })

    it('should create an issue with minimal fields', async () => {
      const issue = await manager.create({
        title: 'Simple Issue',
      })

      expect(issue).toBeDefined()
    })
  })

  describe('get', () => {
    it('should get an issue by number', async () => {
      const issue = await manager.get(123)

      expect(issue.number).toBe(123)
      expect(mockClient.getOctokit().issues.get).toHaveBeenCalledWith({
        owner: 'test',
        repo: 'repo',
        issue_number: 123,
      })
    })
  })

  describe('list', () => {
    it('should list all open issues by default', async () => {
      const issues = await manager.list()

      expect(Array.isArray(issues)).toBe(true)
      expect(mockClient.getOctokit().issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'open',
        })
      )
    })

    it('should filter by assignee', async () => {
      const issues = await manager.list({ assignee: 'alice' })

      expect(mockClient.getOctokit().issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          assignee: 'alice',
        })
      )
    })

    it('should filter by labels', async () => {
      const issues = await manager.list({ labels: ['bug', 'urgent'] })

      expect(mockClient.getOctokit().issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: 'bug,urgent',
        })
      )
    })
  })

  describe('update', () => {
    it('should update issue fields', async () => {
      const issue = await manager.update(123, {
        title: 'Updated Title',
        state: 'closed',
      })

      expect(mockClient.getOctokit().issues.update).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_number: 123,
          title: 'Updated Title',
          state: 'closed',
        })
      )
    })
  })

  describe('addComment', () => {
    it('should add a comment to an issue', async () => {
      await manager.addComment(123, 'Test comment')

      expect(mockClient.getOctokit().issues.createComment).toHaveBeenCalledWith({
        owner: 'test',
        repo: 'repo',
        issue_number: 123,
        body: 'Test comment',
      })
    })
  })

  describe('close', () => {
    it('should close an issue', async () => {
      const issue = await manager.close(123)

      expect(mockClient.getOctokit().issues.update).toHaveBeenCalledWith(
        expect.objectContaining({
          issue_number: 123,
          state: 'closed',
        })
      )
    })

    it('should close an issue with a comment', async () => {
      await manager.close(123, 'Closing as completed')

      expect(mockClient.getOctokit().issues.createComment).toHaveBeenCalled()
      expect(mockClient.getOctokit().issues.update).toHaveBeenCalled()
    })
  })

  describe('addAssignees', () => {
    it('should add assignees to an issue', async () => {
      await manager.addAssignees(123, ['bob', 'carol'])

      expect(mockClient.getOctokit().issues.addAssignees).toHaveBeenCalledWith({
        owner: 'test',
        repo: 'repo',
        issue_number: 123,
        assignees: ['bob', 'carol'],
      })
    })
  })

  describe('addLabels', () => {
    it('should add labels to an issue', async () => {
      await manager.addLabels(123, ['urgent', 'bug'])

      expect(mockClient.getOctokit().issues.addLabels).toHaveBeenCalledWith({
        owner: 'test',
        repo: 'repo',
        issue_number: 123,
        labels: ['urgent', 'bug'],
      })
    })
  })

  describe('getAssignedTo', () => {
    it('should get issues assigned to a user', async () => {
      const issues = await manager.getAssignedTo('alice')

      expect(mockClient.getOctokit().issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          assignee: 'alice',
          state: 'open',
        })
      )
    })
  })

  describe('getByLabels', () => {
    it('should get issues by labels', async () => {
      const issues = await manager.getByLabels(['bug', 'high-priority'])

      expect(mockClient.getOctokit().issues.listForRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          labels: 'bug,high-priority',
        })
      )
    })
  })
})
