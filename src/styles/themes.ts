import type { ThemeConfig, ThemeType } from '@/types/chat'

export const themes: Record<ThemeType, ThemeConfig> = {
  dark: {
    name: 'dark',
    primary: '#00d4ff',
    secondary: '#1a1a2e',
    background: '#0f0f23',
    surface: '#16213e',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    accent: '#00d4ff',
    border: '#2a2a4e'
  },
  light: {
    name: 'light',
    primary: '#0066cc',
    secondary: '#f5f5f5',
    background: '#ffffff',
    surface: '#f9f9f9',
    text: '#333333',
    textSecondary: '#666666',
    accent: '#0066cc',
    border: '#e0e0e0'
  },
  neon: {
    name: 'neon',
    primary: '#00ff88',
    secondary: '#0a0e27',
    background: '#0a0e27',
    surface: '#1a1f3a',
    text: '#00ff88',
    textSecondary: '#00cc6f',
    accent: '#ff00ff',
    border: '#00ff88'
  },
  ocean: {
    name: 'ocean',
    primary: '#00d9ff',
    secondary: '#0d1b2a',
    background: '#0d1b2a',
    surface: '#1b263b',
    text: '#e0f4ff',
    textSecondary: '#a8d8ff',
    accent: '#00d9ff',
    border: '#415a77'
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
}
