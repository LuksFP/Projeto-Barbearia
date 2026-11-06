// Helpers para upload no Supabase Storage
// Bucket: 'barbershop-assets' — crie no Supabase Dashboard com acesso público
//
// Estrutura de paths:
//   covers/{barbershopId}.{ext}   — foto de capa da barbearia
//   avatars/{barberId}.{ext}      — avatar do barbeiro

import { supabase } from './supabase'

const BUCKET = 'barbershop-assets'

/** Extensão do arquivo a partir do MIME type */
function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return map[mime] ?? 'jpg'
}

/** Valida tamanho (max 5 MB) e tipo do arquivo */
function validateImage(file: File): string | null {
  if (file.size > 5 * 1024 * 1024) return 'Imagem muito grande. Máximo 5 MB.'
  if (!file.type.startsWith('image/')) return 'Arquivo inválido. Use JPG, PNG ou WebP.'
  return null
}

export interface UploadResult {
  url: string
  path: string
}

/** Faz upload da capa da barbearia e retorna a URL pública */
export async function uploadCoverImage(barbershopId: string, file: File): Promise<UploadResult> {
  const err = validateImage(file)
  if (err) throw new Error(err)

  const ext = extFromMime(file.type)
  const path = `covers/${barbershopId}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(`Upload falhou: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  // Adiciona cache-busting para forçar revalidação após upsert
  return { url: `${data.publicUrl}?v=${Date.now()}`, path }
}

/** Faz upload do avatar de um barbeiro e retorna a URL pública */
export async function uploadBarberAvatar(barberId: string, file: File): Promise<UploadResult> {
  const err = validateImage(file)
  if (err) throw new Error(err)

  const ext = extFromMime(file.type)
  const path = `avatars/${barberId}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(`Upload falhou: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: `${data.publicUrl}?v=${Date.now()}`, path }
}

/** Foto de produto da loja: products/{barbershopId}/{productId}/{aleatório}.jpg
 *  (a política do Storage só deixa dono/admin escrever na pasta da própria barbearia).
 *  Recebe o arquivo já reduzido (resizeImage). */
export async function uploadProductImage(barbershopId: string, productId: string, file: File): Promise<UploadResult> {
  const err = validateImage(file)
  if (err) throw new Error(err)

  const path = `products/${barbershopId}/${productId}/${crypto.randomUUID()}.${extFromMime(file.type)}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type })

  if (error) throw new Error(`Upload falhou: ${error.message}`)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

/** Apaga do Storage uma foto de produto a partir da URL pública (best-effort). */
export async function removeProductImage(publicUrl: string): Promise<void> {
  const marker = `/object/public/${BUCKET}/`
  const i = publicUrl.indexOf(marker)
  if (i < 0) return
  const path = decodeURIComponent(publicUrl.slice(i + marker.length).split('?')[0])
  if (!path.startsWith('products/')) return
  await supabase.storage.from(BUCKET).remove([path])
}
