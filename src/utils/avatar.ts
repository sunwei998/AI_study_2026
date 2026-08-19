const DEFAULT_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#c0c8d2"/>
      <stop offset="1" stop-color="#7e8a9c"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" fill="url(#a)"/>
  <circle cx="32" cy="23" r="11" fill="#ffffff" opacity="0.92"/>
  <path d="M12 56c0-10.2 9-16.5 20-16.5S52 45.8 52 56v4H12z" fill="#ffffff" opacity="0.92"/>
</svg>`

export const DEFAULT_AVATAR = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(DEFAULT_AVATAR_SVG)}`

export function avatarSrc(avatar?: string | null): string {
  return avatar && avatar.trim() ? avatar : DEFAULT_AVATAR
}

const roundCache = new Map<string, string>()

export function roundAvatarDataUrl(src: string, size = 32): Promise<string> {
  const key = `${src}|${size}`
  const cached = roundCache.get(key)
  if (cached) return Promise.resolve(cached)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(src)
          return
        }
        ctx.clearRect(0, 0, size, size)
        ctx.save()
        ctx.beginPath()
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(img, 0, 0, size, size)
        ctx.restore()
        const out = canvas.toDataURL('image/png')
        roundCache.set(key, out)
        resolve(out)
      } catch {
        resolve(src)
      }
    }
    img.onerror = () => resolve(src)
    img.src = src
  })
}