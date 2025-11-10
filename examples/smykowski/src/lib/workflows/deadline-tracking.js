/**
 * DeadlineTrackingWorkflow monitors commitments and sends reminders
 *
 * Workflow:
 * 1. Check all active commitments
 * 2. Identify upcoming deadlines (within reminder threshold)
 * 3. Identify overdue commitments
 * 4. Send appropriate reminders
 * 5. Escalate overdue items
 */
export class DeadlineTrackingWorkflow {
    constructor(github, reminderDaysThreshold = 2) {
        this.github = github;
        this.reminderDaysThreshold = reminderDaysThreshold;
    }
    /**
     * Execute deadline tracking workflow
     */
    async execute(commitments) {
        const now = new Date();
        // Categorize commitments
        const upcoming = [];
        const overdue = [];
        for (const commitment of commitments) {
            if (!commitment.deadline)
                continue;
            if (commitment.status === 'completed' || commitment.status === 'cancelled') {
                continue;
            }
            const deadline = new Date(commitment.deadline);
            const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            // Get associated GitHub issue if exists
            let issue;
            if (commitment.github_issue_number) {
                try {
                    issue = await this.github.issues.get(commitment.github_issue_number);
                }
                catch (error) {
                    // Issue might not exist
                }
            }
            if (diffDays < 0) {
                // Overdue
                overdue.push({
                    commitment,
                    days_overdue: Math.abs(diffDays),
                    issue,
                });
            }
            else if (diffDays <= this.reminderDaysThreshold) {
                // Upcoming
                upcoming.push({
                    commitment,
                    days_until_deadline: diffDays,
                    issue,
                });
            }
        }
        return {
            commitments,
            upcoming_deadlines: upcoming,
            overdue,
        };
    }
    /**
     * Send reminders for upcoming deadlines
     */
    async sendUpcomingReminders(upcoming) {
        for (const item of upcoming) {
            const message = this.buildReminderMessage(item.commitment, item.days_until_deadline, item.issue);
            // Send via appropriate channel
            if (item.issue) {
                await this.github.issues.addComment(item.issue.number, message);
            }
            // Also could send email (via SES in production)
            console.log(`Reminder sent for commitment ${item.commitment.id}`);
        }
    }
    /**
     * Send overdue escalations
     */
    async sendOverdueEscalations(overdue, teamLeadEmail) {
        for (const item of overdue) {
            const message = this.buildOverdueMessage(item.commitment, item.days_overdue, item.issue);
            // Add urgent label if issue exists
            if (item.issue && item.issue.state === 'open') {
                await this.github.issues.addLabels(item.issue.number, ['overdue']);
                // Add comment
                await this.github.issues.addComment(item.issue.number, message);
            }
            // Escalate to team lead via email
            // (In production, use SES)
            console.log(`Escalation sent for overdue commitment ${item.commitment.id}`);
        }
    }
    /**
     * Build reminder message
     */
    buildReminderMessage(commitment, daysUntil, issue) {
        let message = `Hi @${commitment.person_github || commitment.person_email?.split('@')[0]},\n\n`;
        if (daysUntil === 0) {
            message += `⏰ Friendly reminder: The deadline for this commitment is **today**.\n\n`;
        }
        else if (daysUntil === 1) {
            message += `⏰ Friendly reminder: The deadline for this commitment is **tomorrow**.\n\n`;
        }
        else {
            message += `⏰ Friendly reminder: The deadline for this commitment is in **${daysUntil} days**.\n\n`;
        }
        message += `**Commitment:** ${commitment.commitment_text}\n`;
        message += `**Deadline:** ${new Date(commitment.deadline).toLocaleDateString()}\n\n`;
        if (issue) {
            message += `**Issue:** #${issue.number} - ${issue.title}\n\n`;
        }
        message += `Let me know if you need any help or if the deadline needs adjusting!\n\n`;
        message += `— Tom`;
        return message;
    }
    /**
     * Build overdue message
     */
    buildOverdueMessage(commitment, daysOverdue, issue) {
        let message = `⚠️ Hi @${commitment.person_github || commitment.person_email?.split('@')[0]},\n\n`;
        message += `This commitment is now **${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue**.\n\n`;
        message += `**Commitment:** ${commitment.commitment_text}\n`;
        message += `**Original Deadline:** ${new Date(commitment.deadline).toLocaleDateString()}\n\n`;
        if (issue) {
            message += `**Issue:** #${issue.number} - ${issue.title}\n\n`;
        }
        message += `Can you provide an update on the status? Do you need help or should we adjust the timeline?\n\n`;
        message += `— Tom`;
        return message;
    }
    /**
     * Check if commitment needs reminder
     */
    needsReminder(commitment) {
        if (!commitment.deadline)
            return false;
        if (commitment.status === 'completed' || commitment.status === 'cancelled') {
            return false;
        }
        const now = new Date();
        const deadline = new Date(commitment.deadline);
        const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        // Need reminder if within threshold
        return daysUntil >= 0 && daysUntil <= this.reminderDaysThreshold;
    }
    /**
     * Calculate deadline statistics
     */
    calculateStats(commitments) {
        const now = new Date();
        let active = 0;
        let completed = 0;
        let overdue = 0;
        let upcoming = 0;
        let on_track = 0;
        for (const commitment of commitments) {
            if (commitment.status === 'completed') {
                completed++;
                continue;
            }
            if (commitment.status === 'cancelled') {
                continue;
            }
            active++;
            if (!commitment.deadline) {
                on_track++;
                continue;
            }
            const deadline = new Date(commitment.deadline);
            const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (daysUntil < 0) {
                overdue++;
            }
            else if (daysUntil <= this.reminderDaysThreshold) {
                upcoming++;
            }
            else {
                on_track++;
            }
        }
        return {
            total: commitments.length,
            active,
            completed,
            overdue,
            upcoming,
            on_track,
        };
    }
}
//# sourceMappingURL=deadline-tracking.js.map