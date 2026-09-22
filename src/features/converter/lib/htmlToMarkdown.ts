import type { ConvertOptions, ConvertResult, ListKind, SyntaxId } from '../types'
import { analyzeCoverage } from './syntax'

const ignored = new Set(['script', 'style', 'noscript', 'template', 'meta', 'link', 'head'])
const blockTags = new Set([
  'address', 'article', 'aside', 'blockquote', 'div', 'dl', 'dt', 'dd',
  'figure', 'figcaption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'h7', 'h8', 'h9',
  'hr', 'li', 'ol', 'p', 'pre', 'section', 'table', 'ul',
])

function classOf(node: Element): string {
  return node.getAttribute('class') || ''
}

function attr(node: Element | Record<string, never>, name: string): string {
  if (!('getAttribute' in node) || typeof node.getAttribute !== 'function') return ''
  return node.getAttribute(name) || ''
}

function styleMap(node: Element): Record<string, string> {
  const map: Record<string, string> = {}
  String(attr(node, 'style')).split(';').forEach((part) => {
    const index = part.indexOf(':')
    if (index === -1) return
    map[part.slice(0, index).trim().toLowerCase()] = part.slice(index + 1).trim().toLowerCase()
  })
  return map
}

function hasClass(node: Element, re: RegExp): boolean {
  return re.test(classOf(node))
}

function textOf(node: Node | null): string {
  if (!node) return ''
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || ''
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as Element
  if (el.tagName.toLowerCase() === 'br') return '\n'
  return Array.from(el.childNodes).map(textOf).join('')
}

function cleanInline(text: string): string {
  return String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^\n+|\n+$/g, '')
    .trim()
}

function wrapKeepSpace(text: string, left: string, right = left): string {
  if (!text || !text.trim()) return text
  const lead = text.match(/^\s*/)?.[0] ?? ''
  const tail = text.match(/\s*$/)?.[0] ?? ''
  return lead + left + text.trim() + right + tail
}

function isBold(node: Element): boolean {
  const tag = node.tagName.toLowerCase()
  if (tag === 'strong' || tag === 'b') return true
  const weight = styleMap(node)['font-weight'] || ''
  if (weight === 'bold' || weight === 'bolder') return true
  const number = weight.match(/\d+/)
  return number ? Number(number[0]) >= 600 : false
}

function isItalic(node: Element): boolean {
  const tag = node.tagName.toLowerCase()
  if (tag === 'em' || tag === 'i') return true
  return (styleMap(node)['font-style'] || '').includes('italic')
}

function isStrike(node: Element): boolean {
  const tag = node.tagName.toLowerCase()
  if (tag === 's' || tag === 'strike' || tag === 'del') return true
  return /line-through/.test(attr(node, 'style'))
}

function isUnderline(node: Element): boolean {
  const tag = node.tagName.toLowerCase()
  if (tag === 'u') return true
  const deco = styleMap(node)['text-decoration'] || styleMap(node)['text-decoration-line'] || ''
  return deco.includes('underline')
}

function isHighlight(node: Element): boolean {
  const bg = styleMap(node)['background-color'] || styleMap(node).background || ''
  return /rgb|hsl|#|yellow|mark|highlight/.test(bg) && !/transparent|rgba\(0/.test(bg)
}

function fenceFor(code: string): string {
  let fence = '```'
  while (code.includes(fence)) fence += '`'
  return fence
}

function inlineCode(text: string): string {
  let ticks = '`'
  while (text.includes(ticks)) ticks += '`'
  return /^\s|\s$/.test(text) ? `${ticks} ${text} ${ticks}` : ticks + text + ticks
}

function detectLanguage(node: Element): string {
  const fromData = attr(node, 'data-language') || attr(node, 'data-lang')
  if (fromData) return fromData
  const cls = classOf(node)
  const match = cls.match(/language-([a-z0-9+#.-]+)/i) || cls.match(/ace_([a-z0-9+#.-]+)/i)
  if (match) return match[1]
  const nested = node.querySelector('[data-language], [class*="language-"]')
  return nested ? detectLanguage(nested) : ''
}

function headingLevel(node: Element): number {
  const tag = node.tagName.toLowerCase()
  if (/^h[1-9]$/.test(tag)) return Number(tag.slice(1))
  const token = `${classOf(node)} ${attr(node, 'data-block-type')}`
  const match = token.match(/heading\s*([1-9])/i)
  return match ? Number(match[1]) : 0
}

function listKind(node: Element): ListKind {
  const data = (attr(node, 'data-list') || attr(node, 'data-list-type') || '').toLowerCase()
  if (data === 'unchecked' || data === 'todo' || data === 'checklist' || data === 'task') return 'todo'
  if (data === 'checked' || data === 'todo-done' || data === 'todo-checked') return 'done'
  if (/todo|task/.test(data)) return /done|checked/.test(data) && !/unchecked/.test(data) ? 'done' : 'todo'
  if (data === 'number' || data === 'ordered') return 'ol'
  if (data === 'bullet' || data === 'unordered') return 'ul'
  const box = node.querySelector('input[type="checkbox"]') as HTMLInputElement | null
  if (box) return box.checked || box.hasAttribute('checked') ? 'done' : 'todo'
  if (hasClass(node, /todo|task-list/i) || /todo/.test(attr(node, 'data-block-type'))) {
    const token = classOf(node) + attr(node, 'data-block-type')
    return /done|checked/.test(token) && !/unchecked/.test(token) ? 'done' : 'todo'
  }
  const tag = node.tagName.toLowerCase()
  if (tag === 'ol' || hasClass(node, /ordered|docx-ordered/i)) return 'ol'
  if (tag === 'ul' || hasClass(node, /bullet|docx-bullet/i)) return 'ul'
  return ''
}

function isCallout(node: Element): boolean {
  return hasClass(node, /callout/i) || /callout/.test(attr(node, 'data-block-type'))
}

function isCodeBlock(node: Element): boolean {
  return node.tagName.toLowerCase() === 'pre'
    || hasClass(node, /code-block|zoneType-code|ace-code/i)
    || attr(node, 'data-block-type') === 'code'
}

function isTable(node: Element): boolean {
  return node.tagName.toLowerCase() === 'table' || hasClass(node, /ace-table|docx-table/i)
}

function isDivider(node: Element): boolean {
  return node.tagName.toLowerCase() === 'hr'
    || hasClass(node, /divider|horizontal-line/i)
    || /divider/.test(attr(node, 'data-block-type'))
}

function isImageBlock(node: Element): boolean {
  return hasClass(node, /image-uploaded|gallery|docx-image|image-block/i)
}

function hasBlockChild(node: Element): boolean {
  return Array.from(node.childNodes).some((child) => {
    if (child.nodeType !== Node.ELEMENT_NODE) return false
    const tag = (child as Element).tagName.toLowerCase()
    return blockTags.has(tag) && tag !== 'br'
  })
}

function renderInline(node: Node, notes: Set<SyntaxId>): string {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue || ''
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  if (ignored.has(tag)) return ''
  if (tag === 'br') return '\n'
  if (tag === 'img') {
    const src = attr(el, 'src')
    if (!src) return ''
    notes.add('image')
    const alt = cleanInline(attr(el, 'alt') || attr(el, 'title') || 'image')
    return `![${alt}](${src})`
  }
  if (tag === 'input' && attr(el, 'type').toLowerCase() === 'checkbox') return ''
  if (hasClass(el, /mention|lark-mention/i) || attr(el, 'data-mention')) {
    notes.add('mention')
    const name = cleanInline(textOf(el))
    return name ? `@${name.replace(/^@/, '')}` : ''
  }
  if (attr(el, 'data-formula') || hasClass(el, /katex|math-inline|equation/i)) {
    const tex = attr(el, 'data-formula') || cleanInline(textOf(el))
    notes.add('formula')
    const body = tex.replace(/^\$+|\$+$/g, '')
    return body ? `$$${body}$$` : ''
  }
  if (tag === 'code' && !(el.parentElement && isCodeBlock(el.parentElement))) {
    notes.add('code')
    return inlineCode(textOf(el))
  }

  let content = Array.from(el.childNodes).map((child) => renderInline(child, notes)).join('')
  if (tag === 'a') {
    notes.add('link')
    const href = attr(el, 'href')
    const label = cleanInline(content) || href
    if (href && !href.startsWith('javascript:')) return `[${label}](${href})`
    return label
  }
  if (isBold(el)) {
    notes.add('bold')
    content = wrapKeepSpace(content, '**')
  }
  if (isItalic(el)) {
    notes.add('italic')
    content = wrapKeepSpace(content, '*')
  }
  if (isStrike(el)) {
    notes.add('strike')
    content = wrapKeepSpace(content, '~~')
  }
  if (isUnderline(el)) {
    notes.add('underline')
    content = wrapKeepSpace(content, '<u>', '</u>')
  }
  if (tag === 'mark' || isHighlight(el)) content = wrapKeepSpace(content, '==')
  return content
}

function collectRows(node: Element): Element[][] {
  const rows: Element[][] = []
  if (node.tagName.toLowerCase() === 'tr') {
    const cells = Array.from(node.children).filter((child) => /^(td|th)$/i.test(child.tagName))
    if (cells.length) rows.push(cells)
  }
  Array.from(node.children).forEach((child) => rows.push(...collectRows(child)))
  return rows
}

function renderTable(node: Element, notes: Set<SyntaxId>): string {
  notes.add('table')
  const table = node.tagName.toLowerCase() === 'table' ? node : node.querySelector('table') || node
  const rows = collectRows(table)
  if (!rows.length) return ''
  const width = Math.max(...rows.map((row) => row.length))
  const rendered = rows.map((row) => {
    const cells = row.map((cell) =>
      cleanInline(Array.from(cell.childNodes).map((child) => renderInline(child, notes)).join(''))
        .replace(/\|/g, '\\|')
        .replace(/\n/g, '<br>'),
    )
    while (cells.length < width) cells.push('')
    return cells
  })
  const lines = [
    `| ${rendered[0].join(' | ')} |`,
    `| ${rendered[0].map(() => '---').join(' | ')} |`,
  ]
  rendered.slice(1).forEach((row) => lines.push(`| ${row.join(' | ')} |`))
  return lines.join('\n')
}

function wrapAsList(node: Element): HTMLOListElement | HTMLUListElement {
  const fake = node.ownerDocument.createElement(listKind(node) === 'ol' ? 'ol' : 'ul')
  fake.appendChild(node.cloneNode(true))
  return fake
}

function renderListItem(
  node: Element,
  kind: ListKind,
  indent: number,
  index: number,
  notes: Set<SyntaxId>,
): string {
  let marker = '-'
  if (kind === 'ol') {
    notes.add('ol')
    marker = `${index}.`
  } else if (kind === 'todo') {
    notes.add('todo')
    marker = '- [ ]'
  } else if (kind === 'done') {
    notes.add('todo')
    marker = '- [x]'
  } else {
    notes.add('ul')
  }

  const nested: string[] = []
  const inlines: string[] = []
  Array.from(node.childNodes).forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element
      const tag = el.tagName.toLowerCase()
      if (tag === 'ul' || tag === 'ol' || listKind(el)) {
        nested.push(renderList(tag === 'ul' || tag === 'ol' ? el : wrapAsList(el), indent + 1, notes))
        return
      }
      if (tag === 'input') return
    }
    inlines.push(renderInline(child, notes))
  })

  const text = cleanInline(inlines.join('')).replace(/^\[[ xX]\]\s*/, '')
  return [`${'  '.repeat(indent)}${marker} ${text}`, ...nested].filter(Boolean).join('\n')
}

function renderList(node: Element, indent: number, notes: Set<SyntaxId>): string {
  const kind = listKind(node) || (node.tagName.toLowerCase() === 'ol' ? 'ol' : 'ul')
  if (kind === 'ol') notes.add('ol')
  else if (kind === 'todo' || kind === 'done') notes.add('todo')
  else notes.add('ul')

  let index = Number(attr(node, 'start') || '1')
  if (!Number.isFinite(index) || index < 1) index = 1
  const children = /^(ul|ol)$/i.test(node.tagName)
    ? Array.from(node.children)
    : Array.from(node.childNodes).filter((child): child is Element => child.nodeType === Node.ELEMENT_NODE)

  const items: string[] = []
  children.forEach((child) => {
    const tag = child.tagName.toLowerCase()
    if (tag !== 'li' && listKind(child) === '' && !hasClass(child, /list-item|docx-(bullet|ordered|todo)/i)) {
      if (tag === 'ul' || tag === 'ol') items.push(renderList(child, indent + 1, notes))
      return
    }
    const itemKind = listKind(child) || kind
    items.push(renderListItem(child, itemKind, indent, index, notes))
    if (itemKind === 'ol') index += 1
  })
  return items.filter(Boolean).join('\n')
}

function renderCallout(node: Element, notes: Set<SyntaxId>, useAlert: boolean): string {
  notes.add('callout')
  const body = node.querySelector('.callout-block, .callout-content, [class*="callout"]') || node
  const inner = renderBlocks(body, notes, useAlert, true)
  const emoji = cleanInline(node.querySelector('.callout-emoji, .emoji')?.textContent || '')
  const token = classOf(node) + textOf(node).slice(0, 12)
  const type = /warn|caution|error|danger/i.test(token)
    ? 'WARNING'
    : /tip|success|ok/i.test(classOf(node))
      ? 'TIP'
      : 'NOTE'
  const lines = inner.split('\n')
  if (useAlert) return [`> [!${type}]`, ...lines.map((line) => `> ${line}`)].join('\n')
  return [`> ${emoji ? `${emoji} ` : ''}`, ...lines.map((line) => `> ${line}`)].join('\n').replace('> \n', '> ')
}

function renderPre(node: Element, notes: Set<SyntaxId>): string {
  notes.add('fence')
  const lang = detectLanguage(node)
  const code = textOf(node).replace(/^\n+|\n+$/g, '')
  const fence = fenceFor(code)
  return `${fence}${lang}\n${code}\n${fence}`
}

function renderHeading(node: Element, notes: Set<SyntaxId>): string {
  notes.add('h')
  const level = headingLevel(node) || 1
  const text = cleanInline(Array.from(node.childNodes).map((child) => renderInline(child, notes)).join(''))
  return text ? `${'#'.repeat(level)} ${text}` : ''
}

function renderBlock(node: Node, notes: Set<SyntaxId>, useAlert: boolean, insideCallout: boolean): string {
  if (node.nodeType === Node.TEXT_NODE) return cleanInline(node.nodeValue || '')
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  if (ignored.has(tag)) return ''
  if (isDivider(el)) {
    notes.add('hr')
    return '---'
  }
  if (headingLevel(el)) return renderHeading(el, notes)
  if (isCodeBlock(el)) return renderPre(el, notes)
  if (attr(el, 'data-formula') || hasClass(el, /katex|math-inline|equation/i)) return renderInline(el, notes)
  if (isTable(el) || (tag === 'div' && el.querySelector('.ace-table, table'))) return renderTable(el, notes)
  if (isCallout(el) && !insideCallout) return renderCallout(el, notes, useAlert)
  if (tag === 'blockquote' || hasClass(el, /quote-container|docx-quote/i)) {
    notes.add('quote')
    const inner = hasBlockChild(el)
      ? renderBlocks(el, notes, useAlert, insideCallout)
      : cleanInline(Array.from(el.childNodes).map((child) => renderInline(child, notes)).join(''))
    return inner.split('\n').map((line) => (line ? `> ${line}` : '>')).join('\n')
  }
  if (tag === 'ul' || tag === 'ol') return renderList(el, 0, notes)
  if (listKind(el)) return renderListItem(el, listKind(el), 0, Number(attr(el, 'start') || '1') || 1, notes)
  if (isImageBlock(el) || tag === 'figure') {
    const images = Array.from(el.querySelectorAll('img')).map((img) => renderInline(img, notes))
    if (images.length) return images.join('\n\n')
  }
  if (hasClass(el, /bitable|sheet-block|zoneType-sheet|zoneType-bitable/i)) {
    notes.add('sheet')
    const text = cleanInline(textOf(el))
    return `<!-- 飞书电子表格/多维表格无法完整转为 Markdown${text ? `：${text.slice(0, 80)}` : ''} -->`
  }
  if (hasClass(el, /zoneType-file|docx-file|file-block/i)) {
    notes.add('file')
    const name = cleanInline(textOf(el)) || '附件'
    const href = attr(el.querySelector('a') || {}, 'href')
    return href ? `[${name}](${href})` : name
  }
  if (hasClass(el, /docx-grid|column-block|zoneType-grid/i)) {
    notes.add('grid')
    return renderBlocks(el, notes, useAlert, insideCallout)
  }
  if (tag === 'p' || tag === 'figcaption' || tag === 'div' || tag === 'section' || tag === 'article' || tag === 'span') {
    if (hasBlockChild(el)) return renderBlocks(el, notes, useAlert, insideCallout)
    return cleanInline(Array.from(el.childNodes).map((child) => renderInline(child, notes)).join(''))
  }
  return cleanInline(Array.from(el.childNodes).map((child) => renderInline(child, notes)).join(''))
}

function renderBlocks(node: Element, notes: Set<SyntaxId>, useAlert: boolean, insideCallout: boolean): string {
  const parts: string[] = []
  const children = Array.from(node.childNodes)
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i]
    const kind = child.nodeType === Node.ELEMENT_NODE ? listKind(child as Element) : ''
    const tag = child.nodeType === Node.ELEMENT_NODE ? (child as Element).tagName.toLowerCase() : ''
    if (kind && tag !== 'ul' && tag !== 'ol') {
      const group = [child as Element]
      while (i + 1 < children.length) {
        const next = children[i + 1]
        const nextKind = next.nodeType === Node.ELEMENT_NODE ? listKind(next as Element) : ''
        const nextTag = next.nodeType === Node.ELEMENT_NODE ? (next as Element).tagName.toLowerCase() : ''
        if (!nextKind || nextTag === 'ul' || nextTag === 'ol') break
        if ((kind === 'ol') !== (nextKind === 'ol')) break
        group.push(next as Element)
        i += 1
      }
      const lines = group.map((item, index) => {
        const itemKind = listKind(item)
        const start = Number(attr(item, 'start') || String(index + 1)) || index + 1
        return renderListItem(item, itemKind, 0, start, notes)
      })
      if (lines.length) parts.push(lines.join('\n'))
      continue
    }
    const block = renderBlock(child, notes, useAlert, insideCallout)
    if (block) parts.push(block)
  }
  return parts.join('\n\n')
}

function findRoot(board: HTMLElement): Element {
  return board.querySelector('[data-page-id]')
    || board.querySelector('[data-docx-has-block]')
    || board.querySelector('.page-block, .docx-page-block')
    || board.querySelector(':scope > div')
    || board
}

export function htmlToMarkdown(html: string, options: ConvertOptions = { alerts: true }): ConvertResult {
  const doc = new DOMParser().parseFromString(html || '', 'text/html')
  const notes = new Set<SyntaxId>()
  const markdown = renderBlocks(findRoot(doc.body), notes, options.alerts, false)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return {
    markdown,
    notes,
    coverage: analyzeCoverage(html, notes),
  }
}
