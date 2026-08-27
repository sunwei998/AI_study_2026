let handler: (() => void) | null = null

export function setForbiddenHandler(fn: () => void): void {
  handler = fn
}

export function notifyForbidden(): void {
  handler?.()
}
