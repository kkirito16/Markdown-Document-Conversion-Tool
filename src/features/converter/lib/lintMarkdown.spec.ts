import { describe, expect, it } from 'vitest'
import { lintMarkdown, summarizeLint } from './lintMarkdown'

function ids(result: ReturnType<typeof lintMarkdown>) {
  return {
    fixes: result.fixes.map((item) => item.id),
    issues: result.issues.map((item) => item.id),
  }
}

describe('lintMarkdown', () => {
  it('returns empty result for empty input', () => {
    expect(lintMarkdown('')).toEqual({ markdown: '', fixes: [], issues: [] })
  })

  it('adds a space after heading hashes and collapses extra spaces', () => {
    const result = lintMarkdown('#标题\n##  小节')
    expect(result.markdown).toBe('# 标题\n## 小节')
    expect(ids(result).fixes).toContain('heading-space')
  })

  it('adds a space after list markers and normalizes task boxes', () => {
    const result = lintMarkdown('-苹果\n1.香蕉\n-[]待办\n-[x]完成')
    expect(result.markdown).toBe('- 苹果\n1. 香蕉\n- [ ] 待办\n- [x] 完成')
    expect(ids(result).fixes).toEqual(expect.arrayContaining(['list-space', 'task-marker']))
  })

  it('collapses extra blank lines and trims trailing spaces except hard breaks', () => {
    const result = lintMarkdown('一段   \n\n\n下一行 \n硬换行  ')
    expect(result.markdown).toBe('一段\n\n下一行\n硬换行  ')
    expect(ids(result).fixes).toEqual(expect.arrayContaining(['blank-lines', 'trailing-space']))
  })

  it('strips spaces in fence language and closes a single open fence', () => {
    const result = lintMarkdown('``` javascript\nconst ok = true;')
    expect(result.markdown).toBe('```javascript\nconst ok = true;\n```')
    expect(ids(result).fixes).toEqual(expect.arrayContaining(['fence-lang', 'fence-close']))
  })

  it('does not rewrite markdown inside fenced code', () => {
    const source = '```\n#不是标题\n-也不是列表\n```'
    const result = lintMarkdown(source)
    expect(result.markdown).toBe(source)
    expect(result.fixes).toEqual([])
  })

  it('flags uneven tables, unclosed markers, and heading jumps', () => {
    const result = lintMarkdown('# 一\n\n#### 四\n\n这是 **粗体\n这是 `代码\n\n| A | B |\n| --- | --- |\n| 1 | 2 | 3 |')
    expect(result.markdown).toContain('#### 四')
    expect(ids(result).issues).toEqual(expect.arrayContaining([
      'heading-jump',
      'unclosed-emphasis',
      'unclosed-code',
      'table-columns',
    ]))
  })

  it('flags leftover HTML, empty links, missing image alt, and list indent jumps', () => {
    const result = lintMarkdown('看 <div>块</div>\n<u>下划线</u> 和 [空]() 和 ![](a.png)\n\n- 一项\n      - 跳级')
    expect(ids(result).issues).toEqual(expect.arrayContaining([
      'raw-html',
      'empty-link',
      'image-alt',
      'list-indent',
    ]))
    expect(ids(result).issues).not.toContain('unclosed-emphasis')
  })

  it('does not turn a thematic break into a list', () => {
    const source = '一段\n\n---\n\n下一段'
    const result = lintMarkdown(source)
    expect(result.markdown).toBe(source)
    expect(result.fixes).toEqual([])
  })

  it('leaves already-clean markdown untouched', () => {
    const source = '# 标题\n\n- 一项\n  - 嵌套\n\n- [ ] 待办\n\n![图](a.png)\n[链接](https://example.com)\n\n```js\nconst a = 1\n```'
    const result = lintMarkdown(source)
    expect(result.markdown).toBe(source)
    expect(result.fixes).toEqual([])
    expect(result.issues).toEqual([])
  })
})

describe('summarizeLint', () => {
  it('mentions both automatic fixes and leftover issues', () => {
    const result = lintMarkdown('#标题\n\n# 一\n#### 四')
    expect(summarizeLint(result)).toBe('已自动整理 1 处。还有 1 处需要看一下。')
  })
})
