<script setup lang="ts">
import { nextTick, onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'

const sourceHtml = defineModel<string>('sourceHtml', { required: true })
const inlineImages = defineModel<boolean>('inlineImages', { required: true })
const useAlerts = defineModel<boolean>('useAlerts', { required: true })

defineProps<{
  busy: boolean
}>()

const emit = defineEmits<{
  convert: []
  convertSource: [html: string]
  loadSample: []
  clear: []
  pasteHtml: [html: string]
}>()

const padRef = useTemplateRef<HTMLDivElement>('pad')
const panelRef = useTemplateRef<HTMLElement>('panel')
const locating = shallowRef(false)
let locateTimer = 0

function revealMatch(pattern: RegExp): boolean {
  const pad = padRef.value
  if (!pad) return false
  panelRef.value?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'center',
  })
  const nodes = Array.from(pad.querySelectorAll('*'))
  const target = nodes.find((node) => {
    const open = node.outerHTML.slice(0, node.outerHTML.indexOf('>') + 1)
    pattern.lastIndex = 0
    return pattern.test(open)
  })
  target?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'center',
  })
  locating.value = false
  void nextTick(() => {
    locating.value = true
    window.clearTimeout(locateTimer)
    locateTimer = window.setTimeout(() => {
      locating.value = false
    }, 900)
  })
  return Boolean(target || pad.innerHTML)
}

onBeforeUnmount(() => window.clearTimeout(locateTimer))

defineExpose({ revealMatch })

watch(sourceHtml, (value) => {
  const el = padRef.value
  if (!el || el.innerHTML === value) return
  el.innerHTML = value
})

function currentSourceHtml(): string {
  return padRef.value?.innerHTML ?? sourceHtml.value
}

function onInput() {
  sourceHtml.value = currentSourceHtml()
}

function onPaste(event: ClipboardEvent) {
  const html = event.clipboardData?.getData('text/html')
  if (!html) return
  event.preventDefault()
  emit('pasteHtml', html)
}

function convertSource() {
  const html = currentSourceHtml()
  sourceHtml.value = html
  emit('convertSource', html)
}
</script>

<template>
  <section ref="panel" class="panel">
    <div class="panel-head">
      <h2 class="panel-title">来源</h2>
      <p class="hint">在飞书编辑模式里全选复制，粘贴到这里。若右侧没更新，再点转换。</p>
    </div>

    <div
      ref="pad"
      class="pad"
      :class="{ locating }"
      contenteditable="true"
      spellcheck="false"
      data-placeholder="把飞书内容粘贴到这里"
      @input="onInput"
      @paste="onPaste"
    />

    <div class="toolbar">
      <div class="options">
        <label class="option">
          <input v-model="inlineImages" type="checkbox">
          图片转 Base64
        </label>
        <label class="option">
          <input v-model="useAlerts" type="checkbox">
          高亮块用 GitHub Alert
        </label>
      </div>

      <div class="actions">
        <button class="btn" type="button" :disabled="busy" @click="emit('convert')">
          读取剪贴板
        </button>
        <button class="btn" type="button" :disabled="busy" @click="emit('loadSample')">
          用示例试试
        </button>
        <button class="btn" type="button" @click="emit('clear')">
          清空
        </button>
        <button class="btn btn-primary" type="button" :disabled="busy" @click="convertSource">
          <span v-if="busy" class="spinner" aria-hidden="true" />
          转换
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 16px;
  min-height: 0;
  height: 100%;
}

.panel-head {
  display: grid;
  gap: 6px;
}

.panel-title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
}

.hint {
  margin: 0;
  color: var(--quiet);
  font-size: 13px;
}

.pad {
  min-height: 0;
  overflow: auto;
  padding: 16px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: var(--bg);
  color: var(--ink);
  outline: none;
  box-shadow: none;
  transition: border-color 180ms var(--ease);
}

.pad:hover,
.pad:focus {
  border-color: #d4d4d4;
}

.pad.locating {
  animation: locate-pulse 720ms var(--ease);
}

@keyframes locate-pulse {
  0% { background: #fff7d6; }
  100% { background: var(--bg); }
}

.pad:empty::before {
  content: attr(data-placeholder);
  color: var(--faint);
}

.pad :deep(*) {
  max-width: 100%;
  margin: 0.2em 0;
  font-size: 13px !important;
  line-height: 1.45;
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 18px;
}

.option {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--quiet);
  font-size: 13px;
  cursor: pointer;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.spinner {
  width: 12px;
  height: 12px;
  margin-right: 8px;
  border: 1.5px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 700ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 720px) {
  .actions {
    justify-content: stretch;
  }

  .actions .btn {
    flex: 1 1 calc(50% - 8px);
  }
}
</style>
