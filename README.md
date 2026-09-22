# 飞书转 Markdown

把飞书云文档复制出来的富文本，转成干净的 Markdown。这是一个 Vue 3 本地工具：转换在浏览器里完成，不上传、不登录。

对照飞书当前官方语法（标题最多 9 级、任务列表、公式、引用、分隔线），以及新版文档复制时常见的 HTML 块（高亮块、表格、分栏、多维表等）。

## 怎么用

```bash
npm install
npm run dev
```

浏览器打开提示的本地地址后：

1. 在飞书文档的**编辑模式**里全选并复制。
2. 点 **读取剪贴板**。若浏览器拦截权限，把内容直接粘到左侧。
3. 在右侧查看源码或预览，再复制或下载 `.md`。

也可以点 **用示例试试**，检查当前语法覆盖。

打包静态文件：

```bash
npm run build
npm run preview
```

## 项目结构

按功能拆分，而不是把转换逻辑堆在一个 HTML 里：

```
src/
  App.vue
  features/converter/
    ConverterWorkspace.vue
    components/
    composables/
    lib/
    types.ts
```

- `lib/htmlToMarkdown.ts`：纯函数，负责飞书 HTML → Markdown
- `composables/useConverter.ts`：页面状态和剪贴板 / 导出副作用
- 子组件只通过 props / emit / `v-model` 通信

## 能转什么

| 飞书内容 | Markdown |
| --- | --- |
| 标题 1–9 级 | `#` 到 `#########` |
| 加粗 / 斜体 / 删除线 | `** **` / `* *` / `~~ ~~` |
| 下划线 | `<u>文字</u>` |
| 代码 | 行内代码或 ` ```lang ` |
| 列表 / 任务 | `-`、`1.`、`- [ ]` |
| 引用 / 高亮块 | `>` 或 `> [!NOTE]` |
| 表格、图片、分隔线、公式、链接、@提及、附件 | 对应常见 Markdown |
| 分栏、电子表格 / 多维表 | 按顺序展开，或降级为注释 |

底部语法条：绿色是已转换，黄色是降级，红色是识别到但没转出来，灰色是这篇没有出现。

## 限制

- 字体颜色、批注、同步块来源不会保留。
- 思维导图、流程图、OKR、投票没有稳定的 Markdown 对应物。
- Safari 更建议直接粘贴，而不是读取剪贴板。

## 开发

```bash
npm test
npm run typecheck
```
