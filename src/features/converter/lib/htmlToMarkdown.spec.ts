import { describe, expect, it } from 'vitest'
import { createSampleHtml } from './sample'
import { htmlToMarkdown } from './htmlToMarkdown'

describe('htmlToMarkdown', () => {
  it('converts the official Feishu syntax sample', () => {
    const { markdown, coverage } = htmlToMarkdown(createSampleHtml(), { alerts: true })

    expect(markdown).toContain('# 飞书语法校对稿')
    expect(markdown).toContain('**加粗**')
    expect(markdown).toContain('*斜体*')
    expect(markdown).toContain('<u>下划线</u>')
    expect(markdown).toContain('~~删除线~~')
    expect(markdown).toContain('`inline()`')
    expect(markdown).toContain('[链接](https://www.feishu.cn)')
    expect(markdown).toContain('- 无序一项')
    expect(markdown).toContain('  - 嵌套一项')
    expect(markdown).toContain('1. 有序一项')
    expect(markdown).toContain('- [ ] 未完成任务')
    expect(markdown).toContain('- [x] 已完成任务')
    expect(markdown).toContain('@林间')
    expect(markdown).toContain('$$E=mc^2$$')
    expect(markdown).toContain('> [!NOTE]')
    expect(markdown).toContain('| 列 A | 列 B |')
    expect(markdown).toContain('######### 九级标题应保留')
    expect(markdown).toContain('<!-- 飞书电子表格/多维表格无法完整转为 Markdown')

    expect(coverage.find((item) => item.id === 'todo')?.state).toBe('hit')
    expect(coverage.find((item) => item.id === 'sheet')?.state).toBe('warn')
    expect(coverage.find((item) => item.id === 'grid')?.state).toBe('warn')
  })

  it('does not treat unchecked as completed', () => {
    const html = '<ul><li data-list="unchecked"><input type="checkbox"> 待办</li></ul>'
    const { markdown } = htmlToMarkdown(html, { alerts: true })
    expect(markdown).toContain('- [ ] 待办')
    expect(markdown).not.toContain('- [x] 待办')
  })
})
