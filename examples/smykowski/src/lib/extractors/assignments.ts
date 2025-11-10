import type { ActionItem, TeamMember } from '~/lib/types/index.js'

/**
 * AssignmentLogic determines appropriate assignees for tasks
 *
 * Uses ML-based expertise tracking and workload balancing
 */
export class AssignmentLogic {
  /**
   * Suggest assignee for an action item based on expertise and workload
   */
  suggestAssignee(
    item: ActionItem,
    teamMembers: TeamMember[]
  ): {
    suggested: TeamMember | null
    confidence: number
    reason: string
  } {
    // If already assigned, keep it
    if (item.assignee_github) {
      const existing = teamMembers.find(m => m.github_username === item.assignee_github)
      if (existing) {
        return {
          suggested: existing,
          confidence: 1.0,
          reason: 'Explicitly assigned in email',
        }
      }
    }

    // Filter out members on vacation
    const available = teamMembers.filter(
      m => !m.vacation_schedule?.is_on_vacation
    )

    if (available.length === 0) {
      return {
        suggested: null,
        confidence: 0,
        reason: 'No team members available',
      }
    }

    // Score each team member
    const scores = available.map(member => ({
      member,
      score: this.scoreAssignment(item, member),
    }))

    // Sort by score descending
    scores.sort((a, b) => b.score.total - a.score.total)

    const best = scores[0]

    if (best.score.total < 0.3) {
      return {
        suggested: null,
        confidence: 0,
        reason: 'No good match found',
      }
    }

    return {
      suggested: best.member,
      confidence: best.score.total,
      reason: best.score.reason,
    }
  }

  /**
   * Suggest reassignments for better workload balance
   */
  suggestReassignments(
    overloadedMember: TeamMember,
    teamMembers: TeamMember[],
    issues: ActionItem[]
  ): Array<{
    item: ActionItem
    fromMember: TeamMember
    toMember: TeamMember
    reason: string
  }> {
    const reassignments: Array<{
      item: ActionItem
      fromMember: TeamMember
      toMember: TeamMember
      reason: string
    }> = []

    // Get items assigned to overloaded member
    const assignedItems = issues.filter(
      i => i.assignee_github === overloadedMember.github_username
    )

    // Get available members (sorted by workload, ascending)
    const available = teamMembers
      .filter(m =>
        m.github_username !== overloadedMember.github_username &&
        !m.vacation_schedule?.is_on_vacation
      )
      .sort((a, b) => a.current_workload - b.current_workload)

    for (const item of assignedItems) {
      // Find best alternative assignee
      for (const candidate of available) {
        const score = this.scoreAssignment(item, candidate)

        if (score.total > 0.5) {
          reassignments.push({
            item,
            fromMember: overloadedMember,
            toMember: candidate,
            reason: score.reason,
          })
          break
        }
      }
    }

    return reassignments
  }

  /**
   * Score how well a team member matches an action item
   */
  private scoreAssignment(
    item: ActionItem,
    member: TeamMember
  ): {
    total: number
    expertise: number
    workload: number
    reason: string
  } {
    let expertiseScore = 0
    let matchedAreas: string[] = []

    // Score based on expertise
    const description = item.description.toLowerCase()

    for (const area of member.expertise_areas) {
      const areaLower = area.area.toLowerCase()

      if (description.includes(areaLower)) {
        expertiseScore += area.confidence
        matchedAreas.push(area.area)
      }
    }

    // Normalize expertise score (0-1)
    expertiseScore = Math.min(expertiseScore, 1.0)

    // Score based on workload (prefer members with lower workload)
    // Workload score is inversely proportional to current workload
    // Assuming typical workload is 0-15 issues
    const workloadScore = Math.max(0, 1 - member.current_workload / 15)

    // Weighted average: 60% expertise, 40% workload
    const totalScore = expertiseScore * 0.6 + workloadScore * 0.4

    let reason = ''
    if (expertiseScore > 0.5) {
      reason = `Strong expertise in ${matchedAreas.join(', ')}`
    } else if (workloadScore > 0.7) {
      reason = 'Low current workload'
    } else {
      reason = 'General availability'
    }

    return {
      total: totalScore,
      expertise: expertiseScore,
      workload: workloadScore,
      reason,
    }
  }

  /**
   * Calculate team workload balance
   */
  calculateWorkloadBalance(teamMembers: TeamMember[]): {
    avgWorkload: number
    maxWorkload: number
    minWorkload: number
    imbalanceRatio: number
    isBalanced: boolean
  } {
    if (teamMembers.length === 0) {
      return {
        avgWorkload: 0,
        maxWorkload: 0,
        minWorkload: 0,
        imbalanceRatio: 0,
        isBalanced: true,
      }
    }

    const workloads = teamMembers.map(m => m.current_workload)
    const sum = workloads.reduce((a, b) => a + b, 0)
    const avg = sum / teamMembers.length
    const max = Math.max(...workloads)
    const min = Math.min(...workloads)

    // Imbalance ratio: max/avg
    const imbalanceRatio = avg > 0 ? max / avg : 0

    // Balanced if ratio is less than 2.0 (configurable)
    const isBalanced = imbalanceRatio < 2.0

    return {
      avgWorkload: avg,
      maxWorkload: max,
      minWorkload: min,
      imbalanceRatio,
      isBalanced,
    }
  }

  /**
   * Identify overloaded team members
   */
  getOverloadedMembers(
    teamMembers: TeamMember[],
    threshold: number = 2.0
  ): TeamMember[] {
    const { avgWorkload } = this.calculateWorkloadBalance(teamMembers)

    return teamMembers.filter(
      m => avgWorkload > 0 && m.current_workload / avgWorkload >= threshold
    )
  }
}
