<script setup lang="ts">
import type { CoverageState } from '../types'

const props = defineProps<{
  label: string
  state: CoverageState
  live?: boolean
  current?: boolean
}>()

const emit = defineEmits<{
  locate: []
}>()

function onClick() {
  if (!props.live) return
  emit('locate')
}
</script>

<template>
  <button
    class="chip"
    type="button"
    :class="[`chip-${state}`, { 'chip-live': live, 'chip-current': current }]"
    :aria-disabled="!live"
    :aria-current="current ? 'true' : undefined"
    @click="onClick"
  >
    {{ label }}
  </button>
</template>

<style scoped>
.chip {
  appearance: none;
  padding: 4px 10px;
  border: 1px solid var(--rule);
  border-radius: 999px;
  background: #fafafa;
  color: #a3a3a3;
  font: inherit;
  font-size: 12px;
  line-height: 1.4;
  cursor: default;
  transform: translateY(0) scale(1);
  opacity: 0.58;
  transition:
    transform 180ms var(--ease),
    border-color 180ms var(--ease),
    color 180ms var(--ease),
    background 180ms var(--ease),
    box-shadow 180ms var(--ease),
    opacity 180ms var(--ease);
}

.chip:hover {
  opacity: 0.82;
  transform: translateY(-1px);
  border-color: #e2e2e2;
  background: #f6f6f6;
}

.chip-live {
  cursor: pointer;
  opacity: 1;
}

.chip-hit {
  border-color: #b7e0c8;
  background: #f3fbf7;
  color: var(--ok);
}

.chip-hit:hover {
  transform: translateY(-2px);
  border-color: #74c49a;
  box-shadow: 0 8px 18px rgba(10, 122, 75, 0.12);
}

.chip-warn {
  border-color: #eadfb8;
  background: #fffaf0;
  color: var(--warn);
}

.chip-warn:hover {
  transform: translateY(-2px);
  border-color: #d4b85a;
  box-shadow: 0 8px 18px rgba(163, 124, 0, 0.12);
}

.chip-miss {
  border-color: #f5c8c8;
  background: #fff5f5;
  color: var(--miss);
}

.chip-miss:hover {
  transform: translateY(-2px);
  border-color: #e88;
  box-shadow: 0 8px 18px rgba(238, 0, 0, 0.1);
}

.chip-live:active {
  transform: translateY(0) scale(0.97);
  box-shadow: none;
}

.chip-current {
  animation: chip-pop 460ms var(--ease);
}

.chip-hit.chip-current {
  box-shadow: 0 0 0 4px rgba(10, 122, 75, 0.12);
}

.chip-warn.chip-current {
  box-shadow: 0 0 0 4px rgba(163, 124, 0, 0.12);
}

.chip-miss.chip-current {
  box-shadow: 0 0 0 4px rgba(238, 0, 0, 0.1);
}

@keyframes chip-pop {
  0% { transform: scale(1); }
  40% { transform: scale(1.07); }
  100% { transform: scale(1); }
}
</style>
