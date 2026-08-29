import type { ThemeConfig, ThemeType } from '@/types/chat'

export const themes: Record<ThemeType, ThemeConfig> = {
  dark: {
    name: 'dark',
    primary: '#00e5ff',
    secondary: '#0b0f2a',
    background: '#070a1a',
    surface: '#0e1430',
    text: '#e6f1ff',
    textSecondary: '#8fa3c8',
    accent: '#7c5cff',
    border: '#233055',
    glass: 'rgba(14, 20, 48, 0.62)',
    overlay: 'rgba(7, 10, 26, 0.45)',
    grid: 'rgba(0, 229, 255, 0.07)',
    glow: 'rgba(0, 229, 255, 0.4)',
    glassEdge: 'rgba(255, 255, 255, 0.18)',
    glassSheen: 'rgba(0, 229, 255, 0.05)',
    success: '#00e676',
    warning: '#ffb74d',
    danger: '#ff5b6a'
  },
  light: {
    name: 'light',
    primary: '#4f46e5',
    secondary: '#f3f4f6',
    background: '#f9fafb',
    surface: '#ffffff',
    text: '#111827',
    textSecondary: '#6b7280',
    accent: '#7c3aed',
    border: '#e5e7eb',
    glass: 'rgba(255, 255, 255, 0.75)',
    overlay: 'rgba(249, 250, 251, 0.65)',
    grid: 'rgba(79, 70, 229, 0.04)',
    glow: 'rgba(79, 70, 229, 0.12)',
    glassEdge: 'rgba(255, 255, 255, 0.8)',
    glassSheen: 'rgba(255, 255, 255, 0.5)',
    success: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626'
  },
  neon: {
    name: 'neon',
    primary: '#00ff88',
    secondary: '#0b0a1e',
    background: '#0a0918',
    surface: '#171536',
    text: '#baffdb',
    textSecondary: '#67e8a4',
    accent: '#ff2ea6',
    border: '#2d1f56',
    glass: 'rgba(23, 21, 54, 0.6)',
    overlay: 'rgba(10, 9, 24, 0.45)',
    grid: 'rgba(0, 255, 136, 0.07)',
    glow: 'rgba(0, 255, 136, 0.4)',
    glassEdge: 'rgba(255, 255, 255, 0.16)',
    glassSheen: 'rgba(0, 255, 136, 0.06)',
    success: '#00ff88',
    warning: '#ffd166',
    danger: '#ff2ea6'
  },
  magenta: {
    name: 'magenta',
    primary: '#ff2d95',
    secondary: '#1a0512',
    background: '#120510',
    surface: '#1f0a1a',
    text: '#ffe0f0',
    textSecondary: '#c97aa8',
    accent: '#00e5ff',
    border: '#3d1530',
    glass: 'rgba(31, 10, 26, 0.6)',
    overlay: 'rgba(18, 5, 16, 0.45)',
    grid: 'rgba(255, 45, 149, 0.07)',
    glow: 'rgba(255, 45, 149, 0.4)',
    glassEdge: 'rgba(255, 255, 255, 0.16)',
    glassSheen: 'rgba(255, 45, 149, 0.06)',
    success: '#3ddc97',
    warning: '#ffb74d',
    danger: '#ff4d5e'
  },
  midnight: {
    name: 'midnight',
    primary: '#b388ff',
    secondary: '#0c0918',
    background: '#0a0714',
    surface: '#191238',
    text: '#efe9ff',
    textSecondary: '#a89fd8',
    accent: '#ff79c6',
    border: '#352a66',
    glass: 'rgba(25, 18, 56, 0.62)',
    overlay: 'rgba(10, 7, 20, 0.45)',
    grid: 'rgba(179, 136, 255, 0.08)',
    glow: 'rgba(179, 136, 255, 0.42)',
    glassEdge: 'rgba(255, 255, 255, 0.16)',
    glassSheen: 'rgba(179, 136, 255, 0.07)',
    success: '#69f0ae',
    warning: '#ffca6c',
    danger: '#ff7d9c'
  },
  amber: {
    name: 'amber',
    primary: '#ffb74d',
    secondary: '#1a1105',
    background: '#140d04',
    surface: '#241a0a',
    text: '#fff3e0',
    textSecondary: '#c9a97c',
    accent: '#ff6d00',
    border: '#54401f',
    glass: 'rgba(36, 26, 10, 0.6)',
    overlay: 'rgba(20, 13, 4, 0.45)',
    grid: 'rgba(255, 183, 77, 0.08)',
    glow: 'rgba(255, 183, 77, 0.4)',
    glassEdge: 'rgba(255, 255, 255, 0.15)',
    glassSheen: 'rgba(255, 183, 77, 0.06)',
    success: '#66bb6a',
    warning: '#ff6d00',
    danger: '#e53935'
  },
  mint: {
    name: 'mint',
    primary: '#00e676',
    secondary: '#0a1a12',
    background: '#050f0a',
    surface: '#0d1f15',
    text: '#e0fff0',
    textSecondary: '#7fc9a0',
    accent: '#ff4081',
    border: '#1a3a28',
    glass: 'rgba(13, 31, 21, 0.6)',
    overlay: 'rgba(5, 15, 10, 0.45)',
    grid: 'rgba(0, 230, 118, 0.07)',
    glow: 'rgba(0, 230, 118, 0.4)',
    glassEdge: 'rgba(255, 255, 255, 0.16)',
    glassSheen: 'rgba(0, 230, 118, 0.06)',
    success: '#00c853',
    warning: '#ffb300',
    danger: '#ff5252'
  },
  sand: {
    name: 'sand',
    primary: '#7a4f1f',
    secondary: '#f0e6d0',
    background: '#faf4e8',
    surface: '#ffffff',
    text: '#3d3a2e',
    textSecondary: '#5c4f38',
    accent: '#8b3a0a',
    border: '#d9c9a8',
    glass: 'rgba(250, 244, 232, 0.8)',
    overlay: 'rgba(250, 244, 232, 0.6)',
    grid: 'rgba(122, 79, 31, 0.06)',
    glow: 'rgba(122, 79, 31, 0.25)',
    glassEdge: 'rgba(255, 255, 255, 0.9)',
    glassSheen: 'rgba(255, 255, 255, 0.5)',
    success: '#2e7d32',
    warning: '#b26a00',
    danger: '#b3261e'
  }
}

export function applyTheme(theme: ThemeType): void {
  const config = themes[theme]
  const root = document.documentElement

  root.style.setProperty('--color-primary', config.primary)
  root.style.setProperty('--color-secondary', config.secondary)
  root.style.setProperty('--color-background', config.background)
  root.style.setProperty('--color-surface', config.surface)
  root.style.setProperty('--color-text', config.text)
  root.style.setProperty('--color-text-secondary', config.textSecondary)
  root.style.setProperty('--color-accent', config.accent)
  root.style.setProperty('--color-border', config.border)
  root.style.setProperty('--color-glass', config.glass)
  root.style.setProperty('--color-overlay', config.overlay)
  root.style.setProperty('--color-grid', config.grid)
  root.style.setProperty('--color-glow', config.glow)
  root.style.setProperty('--glass-edge', config.glassEdge)
  root.style.setProperty('--glass-sheen', config.glassSheen)
  root.style.setProperty('--color-success', config.success)
  root.style.setProperty('--color-warning', config.warning)
  root.style.setProperty('--color-danger', config.danger)
}