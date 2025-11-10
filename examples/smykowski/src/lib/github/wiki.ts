import type { GitHubClient } from './client.js'
import type { WikiPageParams } from '~/lib/types/index.js'

/**
 * WikiManager handles GitHub Wiki operations
 *
 * Note: GitHub Wiki is actually a separate Git repository.
 * We interact with it through the repository's wiki pages stored in a special branch.
 */
export class WikiManager {
  constructor(private client: GitHubClient) {}

  /**
   * Get a wiki page
   */
  async getPage(pageName: string): Promise<{ content: string; sha: string } | null> {
    try {
      const path = `${this.sanitizePageName(pageName)}.md`
      const response = await this.client.getOctokit().rest.repos.getContent({
        owner: this.client.getOwner(),
        repo: `${this.client.getRepo()}.wiki`,
        path,
      })

      if ('content' in response.data && response.data.type === 'file') {
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8')
        return {
          content,
          sha: response.data.sha,
        }
      }

      return null
    } catch (error: any) {
      if (error.status === 404) {
        return null
      }
      throw new Error(`Failed to get wiki page "${pageName}": ${error.message}`)
    }
  }

  /**
   * Create or update a wiki page
   */
  async createOrUpdatePage(params: WikiPageParams): Promise<void> {
    try {
      const path = `${this.sanitizePageName(params.title)}.md`
      const existing = await this.getPage(params.title)

      const message = params.message || (existing
        ? `Update ${params.title}`
        : `Create ${params.title}`)

      await this.client.getOctokit().rest.repos.createOrUpdateFileContents({
        owner: this.client.getOwner(),
        repo: `${this.client.getRepo()}.wiki`,
        path,
        message,
        content: Buffer.from(params.content).toString('base64'),
        sha: existing?.sha,
      })
    } catch (error: any) {
      throw new Error(`Failed to create/update wiki page "${params.title}": ${error.message}`)
    }
  }

  /**
   * Update a section of a wiki page (preserving other content)
   */
  async updateSection(pageName: string, sectionTitle: string, newContent: string): Promise<void> {
    const existing = await this.getPage(pageName)
    if (!existing) {
      throw new Error(`Wiki page "${pageName}" does not exist`)
    }

    const updated = this.replaceSectionContent(existing.content, sectionTitle, newContent)

    await this.createOrUpdatePage({
      title: pageName,
      content: updated,
      message: `Update ${sectionTitle} section in ${pageName}`,
    })
  }

  /**
   * Append content to a wiki page
   */
  async appendToPage(pageName: string, content: string): Promise<void> {
    const existing = await this.getPage(pageName)
    if (!existing) {
      // Create new page if it doesn't exist
      await this.createOrUpdatePage({
        title: pageName,
        content,
        message: `Create ${pageName}`,
      })
      return
    }

    const updated = `${existing.content}\n\n${content}`
    await this.createOrUpdatePage({
      title: pageName,
      content: updated,
      message: `Append to ${pageName}`,
    })
  }

  /**
   * Check if a wiki page exists
   */
  async pageExists(pageName: string): Promise<boolean> {
    const page = await this.getPage(pageName)
    return page !== null
  }

  /**
   * Get all wiki pages (note: this requires listing wiki repo contents)
   */
  async listPages(): Promise<string[]> {
    try {
      const response = await this.client.getOctokit().rest.repos.getContent({
        owner: this.client.getOwner(),
        repo: `${this.client.getRepo()}.wiki`,
        path: '',
      })

      if (Array.isArray(response.data)) {
        return response.data
          .filter(item => item.type === 'file' && item.name.endsWith('.md'))
          .map(item => item.name.replace('.md', ''))
      }

      return []
    } catch (error: any) {
      if (error.status === 404) {
        return [] // Wiki not initialized
      }
      throw new Error(`Failed to list wiki pages: ${error.message}`)
    }
  }

  /**
   * Replace content of a specific section in markdown
   */
  private replaceSectionContent(content: string, sectionTitle: string, newContent: string): string {
    const sectionRegex = new RegExp(
      `(^##\\s+${this.escapeRegex(sectionTitle)}\\s*$)([\\s\\S]*?)(?=^##\\s|$)`,
      'gm'
    )

    const match = content.match(sectionRegex)
    if (!match) {
      // Section doesn't exist, append it
      return `${content}\n\n## ${sectionTitle}\n\n${newContent}`
    }

    return content.replace(sectionRegex, `$1\n\n${newContent}\n`)
  }

  /**
   * Sanitize page name for file system
   */
  private sanitizePageName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9-_\s]/g, '')
      .replace(/\s+/g, '-')
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Generate a table of contents from markdown headers
   */
  generateTOC(content: string): string {
    const headers: string[] = []
    const lines = content.split('\n')

    for (const line of lines) {
      const match = line.match(/^(#{2,6})\s+(.+)$/)
      if (match) {
        const level = match[1].length - 2 // Subtract 2 to make ## level 0
        const title = match[2]
        const indent = '  '.repeat(level)
        const anchor = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
        headers.push(`${indent}- [${title}](#${anchor})`)
      }
    }

    return headers.join('\n')
  }
}
