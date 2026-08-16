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
    glow: 'rgba(0, 229, 255, 0.4)'
  },
  light: {
    name: 'light',
    primary: '#0066ff',
    secondary: '#e9efff',
    background: '#f3f6ff',
    surface: '#ffffff',
    text: '#10163a',
    textSecondary: '#5a6a9a',
    accent: '#7c5cff',
    border: '#d3ddf5',
    glass: 'rgba(255, 255, 255, 0.72)',
    overlay: 'rgba(243, 246, 255, 0.55)',
    grid: 'rgba(0, 102, 255, 0.06)',
    glow: 'rgba(0, 102, 255, 0.28)'
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
    glow: 'rgba(0, 255, 136, 0.4)'
  },
  ocean: {
    name: 'ocean',
    primary: '#22d3ee',
    secondary: '#071426',
    background: '#050d1a',
    surface: '#0b1d33',
    text: '#d9f6ff',
    textSecondary: '#7fb8d8',
    accent: '#3b82f6',
    border: '#1d3b56',
    glass: 'rgba(11, 29, 51, 0.6)',
    overlay: 'rgba(5, 13, 26, 0.45)',
    grid: 'rgba(34, 211, 238, 0.07)',
    glow: 'rgba(34, 211, 238, 0.4)'
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
    glow: 'rgba(179, 136, 255, 0.42)'
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
    glow: 'rgba(255, 183, 77, 0.4)'
  },
  rose: {
    name: 'rose',
    primary: '#ff5c8a',
    secondary: '#1c0a12',
    background: '#16070d',
    surface: '#2a1020',
    text: '#ffe4ec',
    textSecondary: '#d99aae',
    accent: '#ff2e63',
    border: '#5a2136',
    glass: 'rgba(42, 16, 32, 0.6)',
    overlay: 'rgba(22, 7, 13, 0.45)',
    grid: 'rgba(255, 92, 138, 0.08)',
    glow: 'rgba(255, 92, 138, 0.4)'
  },
  forest: {
    name: 'forest',
    primary: '#4ade80',
    secondary: '#05150c',
    background: '#04100a',
    surface: '#0a2417',
    text: '#d9ffe9',
    textSecondary: '#7fc9a2',
    accent: '#22d3ee',
    border: '#1d4a33',
    glass: 'rgba(10, 36, 23, 0.6)',
    overlay: 'rgba(4, 16, 10, 0.45)',
    grid: 'rgba(74, 222, 128, 0.08)',
    glow: 'rgba(74, 222, 128, 0.4)'
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
}