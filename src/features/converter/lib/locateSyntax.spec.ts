import { describe, expect, it } from 'vitest'
import { createSampleHtml } from './sample'
import { htmlToMarkdown } from './htmlToMarkdown'
import { lintMarkdown } from './lintMarkdown'
import { findIssueRange, findSyntaxRange } from './locateSyntax'

function slice(markdown: string, id: Parameters<typeof findSyntaxRange>[1]) {
  const range = findSyntaxRange(markdown, id)
  return range ? markdown.slice(range.start, range.end) : null
}

describe('findSyntaxRange', () => {
  it('returns null when the syntax is absent', () => {
    expect(findSyntaxRange('一段普通文字', 'table')).toBeNull()
  })

  it('finds the first heading, task list, table, and fence', () => {
    const { markdown } = htmlToMarkdown(createSampleHtml(), { alerts: true })
    const text = lintMarkdown(markdown).markdown

    expect(slice(text, 'h')).toBe('# 飞书语法校对稿')
    expect(slice(text, 'todo')).toBe('- [ ] 未完成任务')
    expect(slice(text, 'table')).toBe('| 列 A | 列 B |')
    expect(slice(text, 'fence')).toBe('```javascript')
    expect(slice(text, 'callout')).toContain('[!NOTE]')
  })

  it('does not treat a thematic break as a list or bold as italic', () => {
    const markdown = '# 标题\n\n**加粗**\n\n---\n\n- 一项'
    expect(slice(markdown, 'italic')).toBeNull()
    expect(slice(markdown, 'bold')).toBe('**加粗**')
    expect(slice(markdown, 'ul')).toBe('- 一项')
    expect(slice(markdown, 'hr')).toBe('---')
  })
})

describe('findIssueRange', () => {
  it('locates the first heading jump and empty link', () => {
    const markdown = '# 一\n\n#### 四\n\n看 [空]() 和 ![](a.png)'
    const jump = findIssueRange(markdown, 'heading-jump')
    const link = findIssueRange(markdown, 'empty-link')
    const image = findIssueRange(markdown, 'image-alt')

    expect(jump && markdown.slice(jump.start, jump.end)).toBe('#### 四')
    expect(link && markdown.slice(link.start, link.end)).toBe('[空]()')
    expect(image && markdown.slice(image.start, image.end)).toBe('![](a.png)')
  })
})
