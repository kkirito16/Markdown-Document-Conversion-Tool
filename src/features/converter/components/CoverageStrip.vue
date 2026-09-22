<script setup lang="ts">
import type { CoverageItem } from '../types'
import SyntaxChip from './SyntaxChip.vue'

defineProps<{
  items: readonly CoverageItem[]
  currentId?: string | null
}>()

const emit = defineEmits<{
  locate: [item: CoverageItem]
}>()
</script>

<template>
  <section class="strip">
    <h2 class="title">这篇文档里的语法</h2>
    <ul class="list">
      <li v-for="item in items" :key="item.id">
        <SyntaxChip
          :label="item.name"
          :state="item.state"
          :live="item.state !== 'idle'"
          :current="currentId === item.id"
          @locate="emit('locate', item)"
        />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.strip {
  display: grid;
  gap: 12px;
}

.title {
  margin: 0;
  color: var(--quiet);
  font-size: 12px;
  font-weight: 500;
}

.list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
