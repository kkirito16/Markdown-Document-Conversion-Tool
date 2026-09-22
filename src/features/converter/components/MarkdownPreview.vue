<script setup lang="ts">
import { computed } from 'vue'
import { parseMarkdownPreview } from '../lib/preview'
import type { InlineSegment } from '../lib/preview'

const props = defineProps<{
  markdown: string
}>()

const blocks = computed(() => parseMarkdownPreview(props.markdown))

function headingClass(level: number): string {
  return `heading heading-${level}`
}

function isLink(segment: InlineSegment): segment is Extract<InlineSegment, { kind: 'link' }> {
  return segment.kind === 'link'
}
</script>

<template>
  <div class="preview">
    <p v-if="!blocks.length" class="empty">转换后可以在这里预览。</p>
    <template v-for="(block, index) in blocks" :key="index">
      <component
        :is="block.type === 'heading' ? `h${block.level}` : 'p'"
        v-if="block.type === 'heading' || block.type === 'paragraph'"
        :class="block.type === 'heading' ? headingClass(block.level) : 'paragraph'"
      >
        <template v-for="(segment, sIndex) in block.segments" :key="sIndex">
          <a v-if="isLink(segment)" class="link" :href="segment.href">{{ segment.value }}</a>
          <strong v-else-if="segment.kind === 'strong'">{{ segment.value }}</strong>
          <em v-else-if="segment.kind === 'em'">{{ segment.value }}</em>
          <code v-else-if="segment.kind === 'code'" class="code">{{ segment.value }}</code>
          <del v-else-if="segment.kind === 'del'">{{ segment.value }}</del>
          <template v-else>{{ segment.value }}</template>
        </template>
      </component>

      <blockquote v-else-if="block.type === 'quote'" class="quote">
        <p v-for="(line, lineIndex) in block.lines" :key="lineIndex" class="quote-line">
          <template v-for="(segment, sIndex) in line" :key="sIndex">
            <strong v-if="segment.kind === 'strong'">{{ segment.value }}</strong>
            <em v-else-if="segment.kind === 'em'">{{ segment.value }}</em>
            <code v-else-if="segment.kind === 'code'" class="code">{{ segment.value }}</code>
            <template v-else>{{ segment.value }}</template>
          </template>
        </p>
      </blockquote>

      <pre v-else-if="block.type === 'code'" class="fence"><code>{{ block.code }}</code></pre>

      <ul v-else-if="block.type === 'list' && !block.ordered" class="list">
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
          <template v-for="(segment, sIndex) in item" :key="sIndex">
            <code v-if="segment.kind === 'code'" class="code">{{ segment.value }}</code>
            <strong v-else-if="segment.kind === 'strong'">{{ segment.value }}</strong>
            <template v-else>{{ segment.value }}</template>
          </template>
        </li>
      </ul>

      <ol v-else-if="block.type === 'list'" class="list">
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
          <template v-for="(segment, sIndex) in item" :key="sIndex">
            <code v-if="segment.kind === 'code'" class="code">{{ segment.value }}</code>
            <strong v-else-if="segment.kind === 'strong'">{{ segment.value }}</strong>
            <template v-else>{{ segment.value }}</template>
          </template>
        </li>
      </ol>

      <table v-else-if="block.type === 'table'" class="table">
        <tr v-for="(row, rowIndex) in block.rows" :key="rowIndex">
          <component :is="rowIndex === 0 ? 'th' : 'td'" v-for="(cell, cellIndex) in row" :key="cellIndex">
            {{ cell }}
          </component>
        </tr>
      </table>

      <img v-else-if="block.type === 'image'" class="image" :alt="block.alt" :src="block.src">
      <hr v-else-if="block.type === 'hr'" class="rule">
    </template>
  </div>
</template>

<style scoped>
.preview {
  min-height: 100%;
  padding: 22px 24px 36px;
  font-family: var(--sans);
  font-size: 15px;
  line-height: 1.7;
}

.empty {
  margin: 0;
  color: var(--quiet);
  font-size: 14px;
}

.heading {
  margin: 1.2em 0 0.45em;
  font-family: var(--sans);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.heading-1 { font-size: 28px; }
.heading-2 { font-size: 22px; }
.heading-3 { font-size: 18px; }
.heading-4,
.heading-5,
.heading-6 { font-size: 16px; }

.paragraph,
.quote-line {
  margin: 0 0 0.8em;
}

.quote {
  margin: 0 0 1em;
  padding: 0 0 0 14px;
  border-left: 2px solid var(--ink);
  color: var(--quiet);
}

.fence {
  overflow: auto;
  margin: 0 0 1em;
  padding: 12px;
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  background: var(--bg-muted);
  font-family: var(--mono);
  font-size: 13px;
}

.code {
  font-family: var(--mono);
  font-size: 0.88em;
  background: var(--bg-muted);
  padding: 0 4px;
  border-radius: 4px;
}

.list {
  margin: 0 0 1em 1.2em;
  padding: 0;
}

.table {
  width: 100%;
  margin: 0 0 1em;
  border-collapse: collapse;
  font-size: 15px;
}

.table th,
.table td {
  border: 1px solid var(--rule);
  padding: 7px 9px;
  text-align: left;
}

.table th {
  background: var(--bg-muted);
}

.image {
  max-width: 100%;
}

.rule {
  border: 0;
  border-top: 1px solid var(--rule);
}

.link {
  color: var(--link);
}
</style>
