<script setup lang="ts">
defineProps<{
  status: string
}>()
</script>

<template>
  <header class="header">
    <div class="copy">
      <h1 class="title">飞书文档格式转Markdown小工具</h1>
      <p class="lede">复制飞书文档，得到可以继续写的Markdown文件</p>
    </div>
    <p class="status">{{ status }}</p>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  width: 100%;
  gap: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--rule);
}

.copy {
  max-width: 36rem;
}

.title {
  margin: 0;
  font-size: clamp(28px, 4vw, 40px);
  font-weight: 600;
  letter-spacing: -0.05em;
  line-height: 1.05;
}

.lede,
.status {
  margin: 8px 0 0;
  color: var(--quiet);
  font-size: 14px;
}

.status {
  max-width: 26rem;
  padding: 6px 10px;
  border: 1px solid var(--rule);
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--quiet);
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
}

@media (max-width: 800px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .status {
    text-align: left;
  }
}
</style>
