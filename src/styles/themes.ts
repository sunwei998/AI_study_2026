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
    glassSheen: 'rgba(0, 229, 255, 0.05)'
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
    glow: 'rgba(0, 102, 255, 0.28)',
    glassEdge: 'rgba(255, 255, 255, 0.95)',
    glassSheen: 'rgba(255, 255, 255, 0.5)'
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
    glassSheen: 'rgba(0, 255, 136, 0.06)'
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
    glow: 'rgba(34, 211, 238, 0.4)',
    glassEdge: 'rgba(255, 255, 255, 0.16)',
    glassSheen: 'rgba(34, 211, 238, 0.06)'
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
    glassSheen: 'rgba(179, 136, 255, 0.07)'
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
    glassSheen: 'rgba(255, 183, 77, 0.06)'
  },
  mint: {
    name: 'mint',
    primary: '#43a047',
    secondary: '#e8f5e9',
    background: '#eef6ee',
    surface: '#ffffff',
    text: '#263a2a',
    textSecondary: '#6b8a70',
    accent: '#00897b',
    border: '#cfe6cf',
    glass: 'rgba(255, 255, 255, 0.72)',
    overlay: 'rgba(238, 246, 238, 0.55)',
    grid: 'rgba(67, 160, 71, 0.06)',
    glow: 'rgba(67, 160, 71, 0.28)',
    glassEdge: 'rgba(255, 255, 255, 0.95)',
    glassSheen: 'rgba(255, 255, 255, 0.5)'
  },
  sand: {
    name: 'sand',
    primary: '#b07838',
    secondary: '#f5ecdc',
    background: '#faf4e8',
    surface: '#ffffff',
    text: '#3d3a2e',
    textSecondary: '#8d8474',
    accent: '#c2612f',
    border: '#e6dcc2',
    glass: 'rgba(255, 255, 255, 0.72)',
    overlay: 'rgba(250, 244, 232, 0.55)',
    grid: 'rgba(176, 120, 56, 0.06)',
    glow: 'rgba(176, 120, 56, 0.28)',
    glassEdge: 'rgba(255, 255, 255, 0.95)',
    glassSheen: 'rgba(255, 255, 255, 0.5)'
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
}