export type SyntaxId =
  | 'h'
  | 'bold'
  | 'italic'
  | 'strike'
  | 'underline'
  | 'code'
  | 'fence'
  | 'quote'
  | 'ul'
  | 'ol'
  | 'todo'
  | 'hr'
  | 'table'
  | 'image'
  | 'link'
  | 'callout'
  | 'formula'
  | 'mention'
  | 'file'
  | 'grid'
  | 'sheet'

export type CoverageState = 'idle' | 'hit' | 'warn' | 'miss'

export interface SyntaxRule {
  id: SyntaxId
  name: string
  match: RegExp
}

export interface CoverageItem extends SyntaxRule {
  present: boolean
  state: CoverageState
}

export interface ConvertOptions {
  alerts: boolean
}

export interface ConvertResult {
  markdown: string
  notes: Set<SyntaxId>
  coverage: CoverageItem[]
}

export type OutputView = 'source' | 'preview'

export type ListKind = 'ul' | 'ol' | 'todo' | 'done' | ''

export type LintFixId =
  | 'heading-space'
  | 'list-space'
  | 'task-marker'
  | 'blank-lines'
  | 'trailing-space'
  | 'fence-lang'
  | 'fence-close'

export type LintIssueId =
  | 'table-columns'
  | 'unclosed-emphasis'
  | 'unclosed-code'
  | 'heading-jump'
  | 'raw-html'
  | 'empty-link'
  | 'image-alt'
  | 'list-indent'

export interface LintFix {
  id: LintFixId
  name: string
  count: number
}

export interface LintIssue {
  id: LintIssueId
  name: string
}

export interface LintResult {
  markdown: string
  fixes: LintFix[]
  issues: LintIssue[]
}
