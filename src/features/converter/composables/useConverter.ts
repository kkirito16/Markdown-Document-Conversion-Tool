import { computed, readonly, shallowRef } from 'vue'
import { htmlToMarkdown } from '../lib/htmlToMarkdown'
import { inlineRemoteImages } from '../lib/images'
import { lintMarkdown, summarizeLint } from '../lib/lintMarkdown'
import { createSampleHtml } from '../lib/sample'
import { idleCoverage, summarizeCoverage } from '../lib/syntax'
import type { CoverageItem, LintIssue, OutputView } from '../types'
import { readClipboardHtml } from './useClipboardHtml'

export function useConverter() {
  const sourceHtml = shallowRef('')
  const markdown = shallowRef('')
  const coverage = shallowRef<CoverageItem[]>(idleCoverage())
  const issues = shallowRef<LintIssue[]>([])
  const status = shallowRef('复制飞书文档后，点左侧按钮或直接粘贴。')
  const view = shallowRef<OutputView>('source')
  const inlineImages = shallowRef(true)
  const useAlerts = shallowRef(true)
  const busy = shallowRef(false)

  const canExport = computed(() => Boolean(markdown.value.trim()))
  const summary = computed(() => summarizeCoverage(coverage.value))

  async function convertHtml(html: string, note = '') {
    if (!html.trim()) {
      issues.value = []
      status.value = '还没有内容。请先在飞书里全选复制。'
      return
    }
    busy.value = true
    try {
      const prepared = inlineImages.value ? await inlineRemoteImages(html) : html
      const result = htmlToMarkdown(prepared, { alerts: useAlerts.value })
      const lint = lintMarkdown(result.markdown)
      sourceHtml.value = html
      markdown.value = lint.markdown ? `${lint.markdown}\n` : ''
      coverage.value = result.coverage
      issues.value = lint.issues
      status.value = [summarizeCoverage(result.coverage), note, summarizeLint(lint)]
        .filter(Boolean)
        .join(' ')
    } finally {
      busy.value = false
    }
  }

  async function convertFromSource(html = sourceHtml.value) {
    await convertHtml(html, '来自左侧内容。')
  }

  async function convertFromClipboard() {
    try {
      const payload = await readClipboardHtml()
      if (!payload.html) {
        if (sourceHtml.value.trim()) {
          await convertHtml(sourceHtml.value, '来自粘贴区。')
          return
        }
        status.value = payload.note
        return
      }
      await convertHtml(payload.html, payload.note)
    } catch {
      status.value = '浏览器拦住了剪贴板读取。直接粘贴到左侧即可。'
    }
  }

  async function loadSample() {
    const html = createSampleHtml()
    await convertHtml(html, '已载入示例。')
  }

  function clearAll() {
    sourceHtml.value = ''
    markdown.value = ''
    coverage.value = idleCoverage()
    issues.value = []
    status.value = '已清空。'
    view.value = 'source'
  }

  async function copyMarkdown() {
    if (!canExport.value) {
      status.value = '还没有可复制的内容。'
      return
    }
    try {
      await navigator.clipboard.writeText(markdown.value)
      status.value = '已复制 Markdown。'
    } catch {
      status.value = '复制失败，请在结果里手动全选。'
    }
  }

  function downloadMarkdown() {
    if (!canExport.value) {
      status.value = '还没有可下载的内容。'
      return
    }
    const blob = new Blob([markdown.value], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'feishu-doc.md'
    link.click()
    URL.revokeObjectURL(url)
    status.value = '已开始下载。'
  }

  return {
    sourceHtml,
    markdown,
    coverage: readonly(coverage),
    issues: readonly(issues),
    status: readonly(status),
    view,
    inlineImages,
    useAlerts,
    busy: readonly(busy),
    canExport,
    summary,
    convertHtml,
    convertFromSource,
    convertFromClipboard,
    loadSample,
    clearAll,
    copyMarkdown,
    downloadMarkdown,
  }
}
