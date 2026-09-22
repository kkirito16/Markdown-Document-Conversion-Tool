import type { CoverageItem, SyntaxId, SyntaxRule } from '../types'

export const SYNTAX_RULES: SyntaxRule[] = [
  { id: 'h', name: '标题 H1–H9', match: /h[1-9]|heading[1-9]|docx-heading/i },
  { id: 'bold', name: '加粗', match: /<(strong|b)\b|font-weight\s*:\s*(bold|[6-9]00)/i },
  { id: 'italic', name: '斜体', match: /<(em|i)\b|font-style\s*:\s*italic/i },
  { id: 'strike', name: '删除线', match: /<(s|strike|del)\b|line-through/i },
  { id: 'underline', name: '下划线', match: /<u\b|text-decoration[^"']*underline/i },
  { id: 'code', name: '行内代码', match: /<code\b/i },
  { id: 'fence', name: '代码块', match: /<pre\b|code-block|zoneType-code|ace-line|language-/i },
  { id: 'quote', name: '引用', match: /<blockquote\b|quote-container|zoneType-quote|docx-quote/i },
  { id: 'ul', name: '无序列表', match: /<ul\b|data-list=["']bullet|docx-bullet/i },
  { id: 'ol', name: '有序列表', match: /<ol\b|data-list=["']number|docx-ordered/i },
  { id: 'todo', name: '任务列表', match: /type=["']checkbox|data-list=["'](todo|checked|unchecked|checklist)|docx-todo|list-todo/i },
  { id: 'hr', name: '分隔线', match: /<hr\b|divider|horizontal-line|zoneType-horizontal/i },
  { id: 'table', name: '表格', match: /<table\b|ace-table|docx-table/i },
  { id: 'image', name: '图片', match: /<img\b|image-uploaded|gallery|docx-image/i },
  { id: 'link', name: '链接', match: /<a\b/i },
  { id: 'callout', name: '高亮块', match: /callout|zoneType-callout/i },
  { id: 'formula', name: '公式', match: /data-formula|katex|math-inline|\\begin\{|\$\$/i },
  { id: 'mention', name: '@提及', match: /mention|lark-mention|data-mention/i },
  { id: 'file', name: '附件', match: /zoneType-file|docx-file|file-block/i },
  { id: 'grid', name: '分栏', match: /docx-grid|column-block|zoneType-grid/i },
  { id: 'sheet', name: '电子表格 / 多维表', match: /bitable|sheet-block|zoneType-sheet|zoneType-bitable/i },
]

export function idleCoverage(): CoverageItem[] {
  return SYNTAX_RULES.map((item) => ({ ...item, present: false, state: 'idle' }))
}

export function analyzeCoverage(html: string, notes: Set<SyntaxId>): CoverageItem[] {
  return SYNTAX_RULES.map((item) => {
    const present = item.match.test(html)
    let state: CoverageItem['state'] = 'idle'
    if (present && (item.id === 'sheet' || item.id === 'grid')) state = 'warn'
    else if (present && notes.has(item.id)) state = 'hit'
    else if (present) state = 'miss'
    return { ...item, present, state }
  })
}

export function summarizeCoverage(coverage: CoverageItem[]): string {
  const present = coverage.filter((item) => item.present).length
  const hits = coverage.filter((item) => item.state === 'hit').length
  const warns = coverage.filter((item) => item.state === 'warn').length
  if (!present) return '还没有识别到飞书块。'
  return `识别到 ${present} 类语法，转换了 ${hits} 类${warns ? `，${warns} 类已降级` : ''}。`
}
