const MAX_SOURCE_MB = 8
const AVATAR_SIZE = 256

export function fileToAvatarDataUrl(file: File): Promise<string> {
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
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('avatarReadFailed'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = AVATAR_SIZE
        canvas.height = AVATAR_SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('avatarReadFailed'))
          return
        }
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        ctx.save()
        ctx.beginPath()
        ctx.arc(AVATAR_SIZE / 2, AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
        ctx.restore()
        const webp = canvas.toDataURL('image/webp', 0.9)
        resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png'))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}