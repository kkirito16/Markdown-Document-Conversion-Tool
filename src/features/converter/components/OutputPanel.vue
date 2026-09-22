<script setup lang="ts">
import { nextTick, onBeforeUnmount, shallowRef, useTemplateRef } from 'vue'
import { scrollTextareaTo, type TextRange } from '../lib/locateSyntax'
import type { OutputView } from '../types'
import MarkdownPreview from './MarkdownPreview.vue'

const markdown = defineModel<string>('markdown', { required: true })
const view = defineModel<OutputView>('view', { required: true })

defineProps<{
  canExport: boolean
}>()

const emit = defineEmits<{
  copy: []
  download: []
}>()

const panelRef = useTemplateRef<HTMLElement>('panel')
const sourceRef = useTemplateRef<HTMLTextAreaElement>('source')
const locating = shallowRef(false)
let locateTimer = 0

async function revealRange(range: TextRange) {
  panelRef.value?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'center',
  })
  const switched = view.value !== 'source'
  view.value = 'source'
  if (switched) await new Promise((resolve) => window.setTimeout(resolve, 200))
  else await nextTick()
  const el = sourceRef.value
  if (!el) return
  el.focus({ preventScroll: true })
  el.setSelectionRange(range.start, range.end)
  scrollTextareaTo(el, range.start)
  locating.value = false
  await nextTick()
  locating.value = true
  window.clearTimeout(locateTimer)
  locateTimer = window.setTimeout(() => {
    locating.value = false
  }, 900)
}

onBeforeUnmount(() => window.clearTimeout(locateTimer))

defineExpose({ revealRange })
</script>

<template>
  <section ref="panel" class="panel">
    <div class="panel-head">
      <h2 class="panel-title">结果</h2>
      <div class="tabs" role="tablist">
        <button
          class="tab"
          type="button"
          role="tab"
          :aria-selected="view === 'source'"
          :class="{ 'tab-active': view === 'source' }"
          @click="view = 'source'"
        >
          源码
        </button>
        <button
          class="tab"
          type="button"
          role="tab"
          :aria-selected="view === 'preview'"
          :class="{ 'tab-active': view === 'preview' }"
          @click="view = 'preview'"
        >
          预览
        </button>
      </div>
    </div>

    <div class="body">
      <Transition name="swap" mode="out-in">
        <textarea
          v-if="view === 'source'"
          ref="source"
          key="source"
          v-model="markdown"
          class="source"
          :class="{ locating }"
          placeholder="转换结果会出现在这里。"
        />
        <MarkdownPreview v-else key="preview" class="preview-wrap" :markdown="markdown" />
      </Transition>
    </div>

    <div class="actions">
      <button class="btn" type="button" :disabled="!canExport" @click="emit('download')">下载 .md</button>
      <button class="btn btn-primary" type="button" :disabled="!canExport" @click="emit('copy')">复制</button>
    </div>
  </section>
</template>

<style scoped>
.panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
}

.tabs {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--rule);
  border-radius: 8px;
  background: var(--bg);
}

.tab {
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--quiet);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 160ms var(--ease), color 160ms var(--ease);
}

.tab:hover {
  color: var(--ink);
}

.tab-active {
  background: var(--ink);
  color: #fff;
}

.body {
  display: flex;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: var(--bg);
}

.source,
.preview-wrap {
  display: block;
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 0;
  resize: none;
  padding: 16px;
  background: transparent;
  color: var(--ink);
  outline: none;
  overflow: auto;
}

.source {
  font-family: var(--mono);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.source.locating {
  animation: locate-pulse 720ms var(--ease);
}

@keyframes locate-pulse {
  0% { background: #fff7d6; }
  100% { background: transparent; }
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.swap-enter-active,
.swap-leave-active {
  transition: opacity 180ms var(--ease), transform 180ms var(--ease);
}

.swap-enter-from,
.swap-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
