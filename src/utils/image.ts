const MAX_SOURCE_MB = 8
const AVATAR_SIZE = 256

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('avatarNotImage'))
      return
    }
    if (file.size > MAX_SOURCE_MB * 1024 * 1024) {
      reject(new Error('avatarTooLarge'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('avatarReadFailed'))
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}

export async function cropToAvatarDataUrl(
  img: HTMLImageElement,
  srcX: number,
  srcY: number,
  srcSize: number
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('avatarReadFailed')
  ctx.save()
  ctx.beginPath()
  ctx.arc(AVATAR_SIZE / 2, AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
  ctx.restore()
  const webp = canvas.toDataURL('image/webp', 0.9)
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png')
}