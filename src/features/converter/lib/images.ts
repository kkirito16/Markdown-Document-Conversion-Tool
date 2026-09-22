function toDataURL(url: string): Promise<string> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest()
    xhr.onload = () => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(String(reader.result || url))
      reader.readAsDataURL(xhr.response)
    }
    xhr.onerror = () => resolve(url)
    xhr.open('GET', url)
    xhr.responseType = 'blob'
    xhr.send()
  })
}

export async function inlineRemoteImages(html: string): Promise<string> {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const images = Array.from(doc.querySelectorAll('img'))
  await Promise.all(images.map(async (img) => {
    const src = img.getAttribute('src') || ''
    if (!src || src.startsWith('data:')) return
    img.setAttribute('src', await toDataURL(src))
  }))
  return doc.body.innerHTML
}
