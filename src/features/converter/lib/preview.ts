export type InlineSegment =
  | { kind: 'text'; value: string }
  | { kind: 'strong' | 'em' | 'code' | 'del'; value: string }
  | { kind: 'link'; value: string; href: string }

export type PreviewBlock =
  | { type: 'heading'; level: number; segments: InlineSegment[] }
  | { type: 'paragraph'; segments: InlineSegment[] }
  | { type: 'quote'; lines: InlineSegment[][] }
  | { type: 'code'; lang: string; code: string }
  | { type: 'list'; ordered: boolean; items: InlineSegment[][] }
  | { type: 'table'; rows: string[][] }
  | { type: 'hr' }
  | { type: 'image'; alt: string; src: string }

function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = []
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|\*[^*\n]+\*|\[([^\]]+)\]\(([^)]+)\))/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text))) {
    if (match.index > last) segments.push({ kind: 'text', value: text.slice(last, match.index) })
    const token = match[0]
    if (token.startsWith('`')) segments.push({ kind: 'code', value: token.slice(1, -1) })
    else if (token.startsWith('**')) segments.push({ kind: 'strong', value: token.slice(2, -2) })
    else if (token.startsWith('~~')) segments.push({ kind: 'del', value: token.slice(2, -2) })
    else if (token.startsWith('*')) segments.push({ kind: 'em', value: token.slice(1, -1) })
    else segments.push({ kind: 'link', value: match[2], href: match[3] })
    last = match.index + token.length
  }
  if (last < text.length) segments.push({ kind: 'text', value: text.slice(last) })
  return segments.length ? segments : [{ kind: 'text', value: text }]
}

export function parseMarkdownPreview(markdown: string): PreviewBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: PreviewBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i += 1
      continue
    }
    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, '').trim()
      const code: string[] = []
      i += 1
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i])
        i += 1
      }
      blocks.push({ type: 'code', lang, code: code.join('\n') })
      i += 1
      continue
    }
    const heading = line.match(/^(#{1,9})\s+(.*)$/)
    if (heading) {
      blocks.push({ type: 'heading', level: Math.min(heading[1].length, 6), segments: parseInline(heading[2]) })
      i += 1
      continue
    }
    if (/^\s*(?:---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push({ type: 'hr' })
      i += 1
      continue
    }
    const image = line.match(/^!\[([^\]]*)\]\((.+)\)$/)
    if (image) {
      blocks.push({ type: 'image', alt: image[1], src: image[2] })
      i += 1
      continue
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, '').replace(/^\[!\w+\]\s*/, ''))
        i += 1
      }
      blocks.push({ type: 'quote', lines: quote.filter(Boolean).map(parseInline) })
      continue
    }
    if (/^\|/.test(line) && i + 1 < lines.length && /\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const rows: string[][] = []
      while (i < lines.length && /^\|/.test(lines[i])) {
        const raw = lines[i].replace(/^\|\s?|\s?\|$/g, '').split('|').map((cell) => cell.trim())
        if (!raw.every((cell) => /^:?-+:?$/.test(cell))) rows.push(raw)
        i += 1
      }
      if (rows.length) blocks.push({ type: 'table', rows })
      continue
    }
    if (/^\s*(?:[-*+]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line)
      const items: InlineSegment[][] = []
      while (i < lines.length && /^\s*(?:[-*+]|\d+\.)\s+/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^\s*(?:[-*+]|\d+\.)\s+/, '')))
        i += 1
      }
      blocks.push({ type: 'list', ordered, items })
      continue
    }
    blocks.push({ type: 'paragraph', segments: parseInline(line) })
    i += 1
  }

  return blocks
}
