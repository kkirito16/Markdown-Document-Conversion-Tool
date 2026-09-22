import type { LintIssueId, SyntaxId } from '../types'

export interface TextRange {
  start: number
  end: number
}

const FENCE_RE = /^ {0,3}```/
const LIST_ITEM_RE = /^(\s*)(?:[*+-]|\d+\.)\s/

function rangeAt(offset: number, value: string): TextRange {
  return { start: offset, end: offset + value.length }
}

function matchLine(line: string, offset: number, pattern: RegExp): TextRange | null {
  const match = line.match(pattern)
  if (!match || match.index == null) return null
  return {
    start: offset + match.index,
    end: offset + match.index + match[0].length,
  }
}

function isFenceLine(line: string): boolean {
  return FENCE_RE.test(line)
}

function walkLines(
  markdown: string,
  visit: (line: string, offset: number, inFence: boolean) => TextRange | null,
): TextRange | null {
  let offset = 0
  let inFence = false
  for (const line of markdown.split('\n')) {
    const fence = isFenceLine(line)
    const found = visit(line, offset, inFence)
    if (found) return found
    if (fence) inFence = !inFence
    offset += line.length + 1
  }
  return null
}

const SYNTAX_PATTERNS: Record<SyntaxId, RegExp | null> = {
  h: /^(#{1,9}) .+/,
  bold: /\*\*[^*]+?\*\*/,
  italic: /(?<!\*)\*(?!\*)[^*]+?\*(?!\*)/,
  strike: /~~[^~]+?~~/,
  underline: /<u>[\s\S]*?<\/u>/,
  code: /`[^`\n]+`/,
  fence: null,
  quote: /^>.+/,
  ul: /^( *)- (?!\[[ xX]\]).+/,
  ol: /^( *)\d+\. .+/,
  todo: /^( *)[-*+] \[[ xX]\].*/,
  hr: /^(?:---|\*\*\*|___)$/,
  table: /^\|.+\|/,
  image: /!\[[^\]]*\]\([^)]*\)/,
  link: /(?<!!)\[[^\]]+\]\([^)]*\)/,
  callout: /\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/,
  formula: /\$\$[^$\n]+\$\$/,
  mention: /(?<![A-Za-z0-9])@[^\s@]+/,
  file: /\[[^\]]+\.(?:pdf|docx?|xlsx?|pptx?|zip)\]/i,
  grid: null,
  sheet: /<!-- 飞书电子表格/,
}

export function findSyntaxRange(markdown: string, id: SyntaxId): TextRange | null {
  return walkLines(markdown, (line, offset, inFence) => {
    if (id === 'fence') {
      return isFenceLine(line) && !inFence ? rangeAt(offset, line) : null
    }
    if (inFence || isFenceLine(line)) return null
    const pattern = SYNTAX_PATTERNS[id]
    return pattern ? matchLine(line, offset, pattern) : null
  })
}

function cellCount(line: string): number {
  return line.trim().replace(/^\||\|$/g, '').split('|').length
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/.test(line)
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

function emptyLinkRange(line: string, offset: number): TextRange | null {
  const stripped = line.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  const match = stripped.match(/\[[^\]]*\]\(\s*\)|\[]\([^)]+\)/)
  if (!match || match.index == null) return null
  const shift = line.indexOf(match[0])
  if (shift < 0) return null
  return {
    start: offset + shift,
    end: offset + shift + match[0].length,
  }
}

export function findIssueRange(markdown: string, id: LintIssueId): TextRange | null {
  const lines = markdown.split('\n')
  let offset = 0
  let inFence = false
  let lastHeading = 0
  let lastListIndent: number | null = null
  let firstEmphasis: TextRange | null = null
  let firstCode: TextRange | null = null
  let bold = false
  let italic = false
  let inlineCode = false

  for (const line of lines) {
    const fence = isFenceLine(line)
    if (fence) {
      inFence = !inFence
      lastListIndent = null
      offset += line.length + 1
      continue
    }
    if (!inFence) {
      if (id === 'heading-jump') {
        const heading = line.match(/^(#{1,9}) /)
        if (heading) {
          const level = heading[1].length
          if (lastHeading > 0 && level > lastHeading + 1) return rangeAt(offset, line)
          lastHeading = level
        }
      }

      if (id === 'list-indent') {
        const list = line.match(LIST_ITEM_RE)
        if (list) {
          const indent = list[1].length
          if (lastListIndent !== null && indent - lastListIndent > 4) return rangeAt(offset, line)
          lastListIndent = indent
        }
        else if (line.trim()) {
          lastListIndent = null
        }
      }

      if (id === 'raw-html' && hasRawHtml(line)) {
        const match = line.match(/<\/?[a-zA-Z][^>]*>/)
        if (match && match.index != null && !/^<\/?u\b/i.test(match[0]) && !/^<br\b/i.test(match[0])) {
          return {
            start: offset + match.index,
            end: offset + match.index + match[0].length,
          }
        }
      }

      if (id === 'image-alt') {
        const image = matchLine(line, offset, /!\[\]\([^)]*\)/)
        if (image) return image
      }

      if (id === 'empty-link') {
        const link = emptyLinkRange(line, offset)
        if (link) return link
      }

      const listStar = /^(?:\s*)\*(?:\s|\[)/.test(line)
      let cursor = listStar ? line.indexOf('*') + 1 : 0
      while (cursor < line.length) {
        if (line[cursor] === '`') {
          if (!inlineCode && !firstCode) firstCode = { start: offset + cursor, end: offset + cursor + 1 }
          inlineCode = !inlineCode
          cursor += 1
          continue
        }
        if (inlineCode) {
          cursor += 1
          continue
        }
        if (line.startsWith('**', cursor)) {
          if (!bold && !firstEmphasis) firstEmphasis = { start: offset + cursor, end: offset + cursor + 2 }
          bold = !bold
          cursor += 2
          continue
        }
        if (line[cursor] === '*') {
          if (!italic && !firstEmphasis) firstEmphasis = { start: offset + cursor, end: offset + cursor + 1 }
          italic = !italic
          cursor += 1
          continue
        }
        cursor += 1
      }
    }
    offset += line.length + 1
  }

  if (id === 'unclosed-code' && inlineCode) return firstCode
  if (id === 'unclosed-emphasis' && (bold || italic)) return firstEmphasis
  if (id === 'table-columns') return findUnevenTable(markdown)
  return null
}

function findUnevenTable(markdown: string): TextRange | null {
  const lines = markdown.split('\n')
  let offset = 0
  let inFence = false
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (isFenceLine(line)) {
      inFence = !inFence
      offset += line.length + 1
      continue
    }
    if (
      !inFence
      && isTableRow(line)
      && lines[index + 1]
      && isTableSeparator(lines[index + 1])
    ) {
      const columns = cellCount(line)
      let rowOffset = offset + line.length + 1 + lines[index + 1].length + 1
      for (let row = index + 2; row < lines.length; row += 1) {
        if (!isTableRow(lines[row])) break
        if (cellCount(lines[row]) !== columns) return rangeAt(rowOffset, lines[row])
        rowOffset += lines[row].length + 1
      }
    }
    offset += line.length + 1
  }
  return null
}

export function scrollTextareaTo(el: HTMLTextAreaElement, index: number) {
  const style = getComputedStyle(el)
  const mirror = document.createElement('div')
  const marker = document.createElement('span')
  mirror.style.cssText = [
    'position:absolute',
    'visibility:hidden',
    'white-space:pre-wrap',
    'word-wrap:break-word',
    `width:${el.clientWidth}px`,
    `font:${style.font}`,
    `line-height:${style.lineHeight}`,
    `padding:${style.padding}`,
    `letter-spacing:${style.letterSpacing}`,
    `box-sizing:${style.boxSizing}`,
  ].join(';')
  mirror.textContent = el.value.slice(0, index)
  marker.textContent = '|'
  mirror.append(marker)
  document.body.append(mirror)
  const top = marker.offsetTop
  mirror.remove()
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollTo({
    top: Math.max(0, top - el.clientHeight / 3),
    behavior: reduced ? 'auto' : 'smooth',
  })
}
