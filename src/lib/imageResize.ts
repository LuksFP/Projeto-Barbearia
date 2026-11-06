// Reduz foto antes de subir: foto de celular chega com 3–8 MB e o bucket
// aceita 5 MB. Sai JPEG com o lado maior em `max` px.

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }) } catch { /* cai no <img> */ }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

function draw(src: ImageBitmap | HTMLImageElement, max: number): HTMLCanvasElement {
  const w = src.width
  const h = src.height
  const scale = Math.min(1, max / Math.max(w, h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Arquivo inválido. Use JPG, PNG ou WebP.')
  ctx.fillStyle = '#ffffff' // PNG transparente não vira fundo preto no JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
  return canvas
}

export async function resizeImage(file: File, max = 1200, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Arquivo inválido. Use JPG, PNG ou WebP.')
  const canvas = draw(await loadBitmap(file), max)
  const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality))
  if (!blob) throw new Error('Não deu pra ler essa imagem.')
  return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
}

/** Modo demo: a foto fica no navegador como data URL pequena. */
export async function imageToDataUrl(file: File, max = 600, quality = 0.75): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Arquivo inválido. Use JPG, PNG ou WebP.')
  return draw(await loadBitmap(file), max).toDataURL('image/jpeg', quality)
}
