/**
 * Message formatting utilities - convert between Slack mrkdwn and standard markdown
 */

/**
 * Convert GitHub markdown to Slack mrkdwn
 */
export function markdownToSlack(text: string): string {
  let result = text

  // Convert markdown links [text](url) to Slack format <url|text>
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>')

  // Convert bold **text** to *text*
  result = result.replace(/\*\*([^*]+)\*\*/g, '*$1*')

  // Convert italic _text_ to _text_ (same format)
  // No change needed

  // Convert code blocks ```language\ncode``` to ```code```
  result = result.replace(/```\w+\n/g, '```\n')

  // Convert strikethrough ~~text~~ to ~text~
  result = result.replace(/~~([^~]+)~~/g, '~$1~')

  // Convert @username mentions (if we have mapping context, this would be done separately)
  // For now, leave as-is

  return result
}

/**
 * Convert Slack mrkdwn to GitHub markdown
 */
export function slackToMarkdown(text: string): string {
  let result = text

  // Convert Slack links <url|text> to markdown [text](url)
  result = result.replace(/<([^|>]+)\|([^>]+)>/g, '[$2]($1)')

  // Convert plain URLs <url> to markdown links
  result = result.replace(/<(https?:\/\/[^>]+)>/g, '[$1]($1)')

  // Convert Slack user mentions <@U123456> to @username (requires mapping)
  // For now, leave the ID but remove brackets
  result = result.replace(/<@(\w+)>/g, '@$1')

  // Convert Slack channel mentions <#C123456|channel-name> to #channel-name
  result = result.replace(/<#\w+\|([^>]+)>/g, '#$1')

  // Convert Slack bold *text* to **text**
  result = result.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '**$1**')

  // Convert italic _text_ to _text_ (same format)
  // No change needed

  // Convert strikethrough ~text~ to ~~text~~
  result = result.replace(/(?<!~)~([^~\n]+)~(?!~)/g, '~~$1~~')

  // Convert code blocks - Slack and markdown use the same ``` format
  // No change needed

  return result
}

/**
 * Convert Slack user ID to mention format
 */
export function formatSlackMention(userId: string): string {
  return `<@${userId}>`
}

/**
 * Convert Slack channel ID to mention format
 */
export function formatSlackChannelMention(channelId: string, channelName: string): string {
  return `<#${channelId}|${channelName}>`
}

/**
 * Extract user IDs from Slack message
 */
export function extractSlackMentions(text: string): string[] {
  const mentions: string[] = []
  const regex = /<@(\w+)>/g
  let match

  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[1])
  }

  return mentions
}

/**
 * Extract channel IDs from Slack message
 */
export function extractSlackChannelMentions(text: string): string[] {
  const mentions: string[] = []
  const regex = /<#(\w+)\|[^>]+>/g
  let match

  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[1])
  }

  return mentions
}

/**
 * Format a GitHub issue notification for Slack
 */
export function formatIssueNotification(
  repo: string,
  issueNumber: number,
  title: string,
  url: string,
  assignee?: string
): string {
  let text = `*New Issue Created*\n`
  text += `<${url}|#${issueNumber}: ${title}>\n`
  text += `Repository: \`${repo}\``

  if (assignee) {
    text += `\nAssigned to: ${assignee}`
  }

  return text
}

/**
 * Format a GitHub PR notification for Slack
 */
export function formatPRNotification(
  repo: string,
  prNumber: number,
  title: string,
  url: string,
  author?: string
): string {
  let text = `*New Pull Request*\n`
  text += `<${url}|#${prNumber}: ${title}>\n`
  text += `Repository: \`${repo}\``

  if (author) {
    text += `\nAuthor: ${author}`
  }

  return text
}

/**
 * Format a deadline reminder for Slack
 */
export function formatDeadlineReminder(
  itemTitle: string,
  deadline: string,
  daysUntil: number,
  url?: string
): string {
  let text = `⏰ *Deadline Reminder*\n`

  if (url) {
    text += `<${url}|${itemTitle}>\n`
  } else {
    text += `${itemTitle}\n`
  }

  if (daysUntil === 0) {
    text += `Due: *Today* (${deadline})`
  } else if (daysUntil === 1) {
    text += `Due: *Tomorrow* (${deadline})`
  } else if (daysUntil < 0) {
    text += `⚠️ *Overdue* by ${Math.abs(daysUntil)} day(s) (was due ${deadline})`
  } else {
    text += `Due in ${daysUntil} day(s) (${deadline})`
  }

  return text
}

/**
 * Format a status report summary for Slack
 */
export function formatStatusReport(
  projectName: string,
  completionPercent: number,
  totalIssues: number,
  closedIssues: number,
  blockers: string[],
  url?: string
): string {
  let text = `📊 *Status Report: ${projectName}*\n\n`
  text += `Progress: ${completionPercent}% (${closedIssues}/${totalIssues} issues closed)\n\n`

  if (blockers.length > 0) {
    text += `⚠️ *Blockers:*\n`
    blockers.forEach(blocker => {
      text += `• ${blocker}\n`
    })
  } else {
    text += `✅ No blockers\n`
  }

  if (url) {
    text += `\n<${url}|View full report>`
  }

  return text
}
