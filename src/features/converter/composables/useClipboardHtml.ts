export async function readClipboardHtml(): Promise<{ html: string; note: string }> {
  if (navigator.clipboard?.read) {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      if (item.types.includes('text/html')) {
        const html = await (await item.getType('text/html')).text()
        return { html, note: '来自系统剪贴板。' }
      }
    }
  }
  if (navigator.clipboard?.readText) {
    const text = await navigator.clipboard.readText()
    if (text) {
      return {
        html: `<p>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`,
        note: '剪贴板只有纯文本。',
      }
    }
  }
  return { html: '', note: '没有读到飞书 HTML。请先在编辑模式里全选复制。' }
}
