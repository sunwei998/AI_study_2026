import { reactive } from 'vue'

export interface ToastItem {
  id: number
  message: string
  type: 'info' | 'success' | 'error'
}

let nextId = 1

const toasts = reactive<ToastItem[]>([])

export function showToast(message: string, type: ToastItem['type'] = 'info'): void {
  const id = nextId++
  toasts.push({ id, message, type })
  setTimeout(() => {
    const idx = toasts.findIndex((t) => t.id === id)
    if (idx !== -1) toasts.splice(idx, 1)
  }, 3200)
}

export function useToast() {
  return { toasts, showToast }
}