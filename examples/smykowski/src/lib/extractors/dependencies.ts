import { v4 as uuidv4 } from 'uuid'
import type { Email } from '@schrute/lib/types/index.js'
import type { GitHubIssue } from '~/lib/types/index.js'
import type { Dependency } from '~/lib/types/index.js'

/**
 * DependencyExtractor detects dependencies between issues
 */
export class DependencyExtractor {
  /**
   * Extract dependencies from email text
   */
  extractFromEmail(email: Email): Array<{
    blocker: number
    blocked: number
    type: 'blocks' | 'blocked_by' | 'related'
  }> {
    const dependencies: Array<{
      blocker: number
      blocked: number
      type: 'blocks' | 'blocked_by' | 'related'
    }> = []

    const body = email.body.toLowerCase()

    // Pattern 1: "Issue #X blocks #Y" or "#X blocks #Y"
    const blocksPattern = /#(\d+)\s+blocks\s+#(\d+)/gi
    let match = blocksPattern.exec(body)
    while (match) {
      dependencies.push({
        blocker: parseInt(match[1]),
        blocked: parseInt(match[2]),
        type: 'blocks',
      })
      match = blocksPattern.exec(body)
    }

    // Pattern 2: "Issue #Y blocked by #X" or "#Y blocked by #X"
    const blockedByPattern = /#(\d+)\s+(?:is\s+)?blocked\s+by\s+#(\d+)/gi
    match = blockedByPattern.exec(body)
    while (match) {
      dependencies.push({
        blocker: parseInt(match[2]),
        blocked: parseInt(match[1]),
        type: 'blocked_by',
      })
      match = blockedByPattern.exec(body)
    }

    // Pattern 3: "Can't start #Y until #X is done"
    const untilPattern = /can['\w]*\s+(?:start|work on|begin)\s+#(\d+)\s+until\s+#(\d+)/gi
    match = untilPattern.exec(body)
    while (match) {
      dependencies.push({
        blocker: parseInt(match[2]),
        blocked: parseInt(match[1]),
        type: 'blocked_by',
      })
      match = untilPattern.exec(body)
    }

    // Pattern 4: "#X depends on #Y"
    const dependsOnPattern = /#(\d+)\s+depends\s+on\s+#(\d+)/gi
    match = dependsOnPattern.exec(body)
    while (match) {
      dependencies.push({
        blocker: parseInt(match[2]),
        blocked: parseInt(match[1]),
        type: 'blocked_by',
      })
      match = dependsOnPattern.exec(body)
    }

    // Pattern 5: "Related to #X" (weaker relationship)
    const relatedPattern = /related\s+to\s+#(\d+)/gi
    match = relatedPattern.exec(body)
    while (match) {
      // Try to extract the current issue number from subject or body
      const currentIssue = this.extractCurrentIssue(email)
      if (currentIssue) {
        dependencies.push({
          blocker: parseInt(match[1]),
          blocked: currentIssue,
          type: 'related',
        })
      }
      match = relatedPattern.exec(body)
    }

    return dependencies
  }

  /**
   * Extract dependencies from GitHub issue body
   */
  extractFromIssue(issue: GitHubIssue): Array<{
    blocker: number
    blocked: number
    type: 'blocks' | 'blocked_by' | 'related'
  }> {
    const body = issue.body || ''
    return this.extractDependencies(body, issue.number)
  }

  /**
   * Generic dependency extraction from text
   */
  private extractDependencies(
    text: string,
    currentIssue?: number
  ): Array<{
    blocker: number
    blocked: number
    type: 'blocks' | 'blocked_by' | 'related'
  }> {
    const dependencies: Array<{
      blocker: number
      blocked: number
      type: 'blocks' | 'blocked_by' | 'related'
    }> = []

    const lowerText = text.toLowerCase()

    // Blocks pattern
    const blocksPattern = /#(\d+)\s+blocks\s+#(\d+)/gi
    let match = blocksPattern.exec(lowerText)
    while (match) {
      dependencies.push({
        blocker: parseInt(match[1]),
        blocked: parseInt(match[2]),
        type: 'blocks',
      })
      match = blocksPattern.exec(lowerText)
    }

    // Blocked by pattern
    const blockedByPattern = /#(\d+)\s+(?:is\s+)?blocked\s+by\s+#(\d+)/gi
    match = blockedByPattern.exec(lowerText)
    while (match) {
      dependencies.push({
        blocker: parseInt(match[2]),
        blocked: parseInt(match[1]),
        type: 'blocked_by',
      })
      match = blockedByPattern.exec(lowerText)
    }

    // If current issue is known, look for simpler patterns
    if (currentIssue) {
      // "Blocked by #X"
      const simpleBlockedPattern = /blocked\s+by\s+#(\d+)/gi
      match = simpleBlockedPattern.exec(lowerText)
      while (match) {
        dependencies.push({
          blocker: parseInt(match[1]),
          blocked: currentIssue,
          type: 'blocked_by',
        })
        match = simpleBlockedPattern.exec(lowerText)
      }

      // "Depends on #X"
      const dependsPattern = /depends\s+on\s+#(\d+)/gi
      match = dependsPattern.exec(lowerText)
      while (match) {
        dependencies.push({
          blocker: parseInt(match[1]),
          blocked: currentIssue,
          type: 'blocked_by',
        })
        match = dependsPattern.exec(lowerText)
      }

      // "Blocks #X"
      const simpleBlocksPattern = /blocks\s+#(\d+)/gi
      match = simpleBlocksPattern.exec(lowerText)
      while (match) {
        dependencies.push({
          blocker: currentIssue,
          blocked: parseInt(match[1]),
          type: 'blocks',
        })
        match = simpleBlocksPattern.exec(lowerText)
      }
    }

    return dependencies
  }

  /**
   * Create dependency objects
   */
  createDependencies(
    extracted: Array<{
      blocker: number
      blocked: number
      type: 'blocks' | 'blocked_by' | 'related'
    }>
  ): Dependency[] {
    return extracted.map(dep => ({
      id: uuidv4(),
      blocker_issue_number: dep.blocker,
      blocked_issue_number: dep.blocked,
      dependency_type: dep.type,
      created_at: new Date().toISOString(),
      status: 'active',
    }))
  }

  /**
   * Build dependency graph
   */
  buildGraph(dependencies: Dependency[]): Map<number, {
    blocks: number[]
    blockedBy: number[]
  }> {
    const graph = new Map<number, { blocks: number[]; blockedBy: number[] }>()

    for (const dep of dependencies) {
      if (dep.status !== 'active') continue

      // Ensure both issues are in graph
      if (!graph.has(dep.blocker_issue_number)) {
        graph.set(dep.blocker_issue_number, { blocks: [], blockedBy: [] })
      }
      if (!graph.has(dep.blocked_issue_number)) {
        graph.set(dep.blocked_issue_number, { blocks: [], blockedBy: [] })
      }

      // Add edges
      const blocker = graph.get(dep.blocker_issue_number)!
      const blocked = graph.get(dep.blocked_issue_number)!

      blocker.blocks.push(dep.blocked_issue_number)
      blocked.blockedBy.push(dep.blocker_issue_number)
    }

    return graph
  }

  /**
   * Detect circular dependencies
   */
  detectCircular(dependencies: Dependency[]): number[][] {
    const graph = this.buildGraph(dependencies)
    const visited = new Set<number>()
    const recursionStack = new Set<number>()
    const cycles: number[][] = []

    const dfs = (node: number, path: number[]): void => {
      visited.add(node)
      recursionStack.add(node)
      path.push(node)

      const edges = graph.get(node)
      if (edges) {
        for (const neighbor of edges.blocks) {
          if (!visited.has(neighbor)) {
            dfs(neighbor, [...path])
          } else if (recursionStack.has(neighbor)) {
            // Found a cycle
            const cycleStart = path.indexOf(neighbor)
            const cycle = path.slice(cycleStart)
            cycles.push(cycle)
          }
        }
      }

      recursionStack.delete(node)
    }

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, [])
      }
    }

    return cycles
  }

  /**
   * Get all issues that are blocked
   */
  getBlockedIssues(dependencies: Dependency[]): number[] {
    const blocked = new Set<number>()

    for (const dep of dependencies) {
      if (dep.status === 'active') {
        blocked.add(dep.blocked_issue_number)
      }
    }

    return Array.from(blocked)
  }

  /**
   * Get all blockers for a specific issue
   */
  getBlockers(issueNumber: number, dependencies: Dependency[]): number[] {
    return dependencies
      .filter(
        dep =>
          dep.status === 'active' && dep.blocked_issue_number === issueNumber
      )
      .map(dep => dep.blocker_issue_number)
  }

  /**
   * Try to extract current issue number from email
   */
  private extractCurrentIssue(email: Email): number | null {
    // Look in subject for #123 pattern
    const subjectMatch = email.subject.match(/#(\d+)/)
    if (subjectMatch) {
      return parseInt(subjectMatch[1])
    }

    // Look in body for "this issue" references near #123
    const bodyMatch = email.body.match(/this\s+issue\s+#(\d+)/i)
    if (bodyMatch) {
      return parseInt(bodyMatch[1])
    }

    return null
  }
}
