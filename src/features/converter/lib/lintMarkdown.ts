import type { LintFix, LintFixId, LintIssue, LintIssueId, LintResult } from '../types'

const FIX_NAMES: Record<LintFixId, string> = {
  'heading-space': '标题空格',
  'list-space': '列表空格',
  'task-marker': '任务标记',
  'blank-lines': '多余空行',
  'trailing-space': '行尾空格',
  'fence-lang': '代码块语言',
  'fence-close': '代码块收尾',
}

const ISSUE_NAMES: Record<LintIssueId, string> = {
  'table-columns': '表格列数不对',
  'unclosed-emphasis': '强调未闭合',
  'unclosed-code': '行内代码未闭合',
  'heading-jump': '标题级跳跃',
  'raw-html': '残留 HTML',
  'empty-link': '空链接',
  'image-alt': '图片没有 alt',
  'list-indent': '列表缩进跳级',
}

const FENCE_RE = /^ {0,3}```/
const HEADING_RE = /^(#{1,9})([ \t]*)(.*)$/
const TASK_RE = /^(\s*)([*+-])(?:\s*)\[([xX ])?\](?:\s*)(.*)$/
const UL_RE = /^(\s*)([*+-])(?!\s|\[)(\S.*)$/
const OL_RE = /^(\s*)(\d+\.)(?!\s)(\S.*)$/
const LIST_ITEM_RE = /^(\s*)(?:[*+-]|\d+\.)\s/
const TABLE_SEP_RE = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/

function bumpFix(counts: Map<LintFixId, number>, id: LintFixId) {
  counts.set(id, (counts.get(id) ?? 0) + 1)
}

function toFixes(counts: Map<LintFixId, number>): LintFix[] {
  return [...counts.entries()].map(([id, count]) => ({
    id,
    name: FIX_NAMES[id],
    count,
  }))
}

function addIssue(issues: Map<LintIssueId, LintIssue>, id: LintIssueId) {
  if (!issues.has(id)) issues.set(id, { id, name: ISSUE_NAMES[id] })
}

function isFenceLine(line: string): boolean {
  return FENCE_RE.test(line)
}

function fixFenceLang(line: string, counts: Map<LintFixId, number>): string {
  const match = line.match(/^( {0,3}```)(.*)$/)
  if (!match) return line
  const lang = match[2]
  if (!lang.trim()) return line
  const compact = lang.trim().replace(/\s+/g, '')
  if (lang === compact) return line
  bumpFix(counts, 'fence-lang')
  return `${match[1]}${compact}`
}

function fixTrailingSpace(line: string, counts: Map<LintFixId, number>): string {
  if (!/[ \t]$/.test(line)) return line
  if (/[^ \t]  $/.test(line)) return line
  bumpFix(counts, 'trailing-space')
  return line.replace(/[ \t]+$/, '')
}

function fixHeading(line: string, counts: Map<LintFixId, number>): string {
  const match = line.match(HEADING_RE)
  if (!match) return line
  const [, hashes, spaces, rest] = match
  if (!rest || spaces === ' ') return line
  bumpFix(counts, 'heading-space')
  return `${hashes} ${rest.trimStart()}`
}

function fixTask(line: string, counts: Map<LintFixId, number>): string | null {
  const match = line.match(TASK_RE)
  if (!match) return null
  const [, indent, marker, check = ' ', rest] = match
  const box = check === 'x' || check === 'X' ? 'x' : ' '
  const next = `${indent}${marker} [${box}]${rest ? ` ${rest}` : ''}`
  if (next === line) return line
  bumpFix(counts, 'task-marker')
  return next
}

function isThematicBreak(line: string): boolean {
  return /^\s{0,3}(?:(?:-[\t ]*){3,}|(?:\*[\t ]*){3,}|(?:_[\t ]*){3,})$/.test(line)
}

function fixList(line: string, counts: Map<LintFixId, number>): string {
  if (isThematicBreak(line)) return line
  const task = fixTask(line, counts)
  if (task !== null) return task
  const ul = line.match(UL_RE)
  if (ul) {
    bumpFix(counts, 'list-space')
    return `${ul[1]}${ul[2]} ${ul[3]}`
  }
  const ol = line.match(OL_RE)
  if (ol) {
    bumpFix(counts, 'list-space')
    return `${ol[1]}${ol[2]} ${ol[3]}`
  }
  return line
}

function fixContentLine(line: string, counts: Map<LintFixId, number>): string {
  return fixHeading(fixList(fixTrailingSpace(line, counts), counts), counts)
}

function collapseBlankLines(text: string, counts: Map<LintFixId, number>): string {
  const next = text.replace(/\n{3,}/g, '\n\n')
  if (next !== text) bumpFix(counts, 'blank-lines')
  return next
}

function cellCount(line: string): number {
  return line.trim().replace(/^\||\|$/g, '').split('|').length
}

function isTableSeparator(line: string): boolean {
  return TABLE_SEP_RE.test(line)
}

function isTableRow(line: string): boolean {
  return line.includes('|') && !isTableSeparator(line)
}

function hasRawHtml(line: string): boolean {
  const stripped = line
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?u\b[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '')
  return /<\/?[a-zA-Z][^>]*>/.test(stripped)
}

function hasEmptyLink(line: string): boolean {
  const withoutImages = line.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  return /\[[^\]]*\]\(\s*\)/.test(withoutImages) || /\[]\([^)]+\)/.test(withoutImages)
}

function collectFenceState(lines: string[]): boolean[] {
  const inside: boolean[] = []
  let inFence = false
  for (const line of lines) {
    if (isFenceLine(line)) {
      inside.push(false)
      inFence = !inFence
      continue
    }
    inside.push(inFence)
  }
  return inside
}

function detectIssues(markdown: string): LintIssue[] {
  const issues = new Map<LintIssueId, LintIssue>()
  const lines = markdown.split('\n')
  const inFence = collectFenceState(lines)
  let lastHeading = 0
  let lastListIndent: number | null = null
  let bold = false
  let italic = false
  let inlineCode = false

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (isFenceLine(line)) {
      lastListIndent = null
      continue
    }
    if (inFence[index]) continue

    const heading = line.match(/^(#{1,9}) /)
    if (heading) {
      const level = heading[1].length
      if (lastHeading > 0 && level > lastHeading + 1) addIssue(issues, 'heading-jump')
      lastHeading = level
    }

    const list = line.match(LIST_ITEM_RE)
    if (list) {
      const indent = list[1].length
      if (lastListIndent !== null && indent - lastListIndent > 4) addIssue(issues, 'list-indent')
      lastListIndent = indent
    }
    else if (line.trim()) {
      lastListIndent = null
    }

    if (hasRawHtml(line)) addIssue(issues, 'raw-html')
    if (/!\[\]\([^)]*\)/.test(line)) addIssue(issues, 'image-alt')
    if (hasEmptyLink(line)) addIssue(issues, 'empty-link')

    if (
      isTableRow(line)
      && lines[index + 1]
      && isTableSeparator(lines[index + 1])
      && !inFence[index + 1]
    ) {
      const columns = cellCount(line)
      for (let row = index + 2; row < lines.length; row += 1) {
        if (inFence[row] || !isTableRow(lines[row])) break
        if (cellCount(lines[row]) !== columns) addIssue(issues, 'table-columns')
      }
    }

    const listStar = /^(?:\s*)\*(?:\s|\[)/.test(line)
    let cursor = listStar ? line.indexOf('*') + 1 : 0
    while (cursor < line.length) {
      if (line[cursor] === '`') {
        inlineCode = !inlineCode
        cursor += 1
        continue
      }
      if (inlineCode) {
        cursor += 1
        continue
      }
      if (line.startsWith('**', cursor)) {
        bold = !bold
        cursor += 2
        continue
      }
      if (line[cursor] === '*') {
        italic = !italic
        cursor += 1
        continue
      }
      cursor += 1
    }
  }

  if (inlineCode) addIssue(issues, 'unclosed-code')
  if (bold || italic) addIssue(issues, 'unclosed-emphasis')
  return [...issues.values()]
}

export function lintMarkdown(source: string): LintResult {
  if (!source) return { markdown: '', fixes: [], issues: [] }

  const counts = new Map<LintFixId, number>()
  const lines = source.split('\n')
  let inFence = false

  const nextLines = lines.map((line) => {
    if (isFenceLine(line)) {
      if (!inFence) {
        inFence = true
        return fixFenceLang(line, counts)
      }
      inFence = false
      return line
    }
    if (inFence) return line
    return fixContentLine(line, counts)
  })

  if (inFence) {
    nextLines.push('```')
    bumpFix(counts, 'fence-close')
  }

  const markdown = collapseBlankLines(nextLines.join('\n'), counts)
  return {
    markdown,
    fixes: toFixes(counts),
    issues: detectIssues(markdown),
  }
}

export function summarizeLint(result: LintResult): string {
  const fixCount = result.fixes.reduce((sum, item) => sum + item.count, 0)
  const issueCount = result.issues.length
  if (fixCount && issueCount) return `已自动整理 ${fixCount} 处。还有 ${issueCount} 处需要看一下。`
  if (fixCount) return `已自动整理 ${fixCount} 处。`
  if (issueCount) return `还有 ${issueCount} 处需要看一下。`
  return ''
}
