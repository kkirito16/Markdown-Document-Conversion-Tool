<script setup lang="ts">
import { onBeforeUnmount, shallowRef, useTemplateRef } from 'vue'
import AppHeader from './components/AppHeader.vue'
import CoverageStrip from './components/CoverageStrip.vue'
import IssueStrip from './components/IssueStrip.vue'
import OutputPanel from './components/OutputPanel.vue'
import SourcePanel from './components/SourcePanel.vue'
import { useConverter } from './composables/useConverter'
import { findIssueRange, findSyntaxRange } from './lib/locateSyntax'
import type { CoverageItem, LintIssue } from './types'

const {
  sourceHtml,
  markdown,
  coverage,
  issues,
  status,
  view,
  inlineImages,
  useAlerts,
  busy,
  canExport,
  convertHtml,
  convertFromSource,
  convertFromClipboard,
  loadSample,
  clearAll,
  copyMarkdown,
  downloadMarkdown,
} = useConverter()

const outputRef = useTemplateRef<{ revealRange: (range: { start: number, end: number }) => Promise<void> | void }>('output')
const sourceRef = useTemplateRef<{ revealMatch: (pattern: RegExp) => boolean }>('source')
const currentId = shallowRef<string | null>(null)
let currentTimer = 0

function markCurrent(id: string) {
  currentId.value = id
  window.clearTimeout(currentTimer)
  currentTimer = window.setTimeout(() => {
    currentId.value = null
  }, 1200)
}

async function locateCoverage(item: CoverageItem) {
  if (item.state === 'idle') return
  markCurrent(item.id)
  const range = findSyntaxRange(markdown.value, item.id)
  if (range) {
    await outputRef.value?.revealRange(range)
    return
  }
  sourceRef.value?.revealMatch(item.match)
}

async function locateIssue(item: LintIssue) {
  markCurrent(item.id)
  const range = findIssueRange(markdown.value, item.id)
  if (range) await outputRef.value?.revealRange(range)
}

onBeforeUnmount(() => window.clearTimeout(currentTimer))
</script>

<template>
  <div class="page">
    <AppHeader :status="status" />
    <div class="workspace">
      <SourcePanel
        ref="source"
        class="pane pane-source"
        v-model:source-html="sourceHtml"
        v-model:inline-images="inlineImages"
        v-model:use-alerts="useAlerts"
        :busy="busy"
        @convert="convertFromClipboard"
        @convert-source="convertFromSource"
        @load-sample="loadSample"
        @clear="clearAll"
        @paste-html="convertHtml($event, '来自粘贴。')"
      />
      <OutputPanel
        ref="output"
        class="pane pane-output"
        v-model:markdown="markdown"
        v-model:view="view"
        :can-export="canExport"
        @copy="copyMarkdown"
        @download="downloadMarkdown"
      />
    </div>
    <CoverageStrip class="coverage" :items="coverage" :current-id="currentId" @locate="locateCoverage" />
    <IssueStrip class="issues" :items="issues" :current-id="currentId" @locate="locateIssue" />
  </div>
</template>

<style scoped>
.page {
  width: min(1180px, calc(100vw - 48px));
  margin: 0 auto;
  padding: 48px 0 64px;
  display: grid;
  gap: 28px;
  animation: rise 520ms var(--ease) both;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 24px;
  min-height: 640px;
  height: min(72vh, 780px);
}

.pane {
  min-height: 0;
}

.pane-source {
  animation: rise 560ms var(--ease) 80ms both;
}

.pane-output {
  animation: rise 560ms var(--ease) 140ms both;
}

.coverage {
  animation: rise 560ms var(--ease) 200ms both;
}

.issues {
  animation: rise 560ms var(--ease) 240ms both;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (max-width: 900px) {
  .page {
    width: min(100vw - 24px, 720px);
    padding-top: 24px;
  }

  .workspace {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
  }

  .pane-source,
  .pane-output {
    height: 560px;
  }
}
</style>
