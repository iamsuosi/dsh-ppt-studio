export interface Theme {
  id: string
  name: { zh: string; en: string }
  mood: { zh: string; en: string }
  bestFor: { zh: string; en: string }
  dark: boolean
  palette: {
    bg: string
    panel: string
    fg: string
    muted: string
    accent: string
    accent2: string
  }
  fonts: {
    heading: string
    body: string
  }
}

export const THEMES: Record<string, Theme> = {
  data: {
    id: 'data',
    name: { zh: 'Data Drift', en: 'Data Drift' },
    mood: { zh: 'Futuristic, immersive, cutting-edge', en: 'Futuristic, immersive, cutting-edge' },
    bestFor: { zh: 'AI / research / tech launches', en: 'AI / research / tech launches' },
    dark: true,
    palette: { bg: '070B14', panel: '0D1424', fg: 'E8F1FF', muted: '7E8BA8', accent: '7C3AED', accent2: '06B6D4' },
    fonts: { heading: 'Space Grotesk', body: 'Segoe UI' },
  },
  swiss: {
    id: 'swiss',
    name: { zh: 'Swiss Pulse', en: 'Swiss Pulse' },
    mood: { zh: 'Precise, rational, data-driven', en: 'Precise, rational, data-driven' },
    bestFor: { zh: 'SaaS / data / developer tools', en: 'SaaS / data / developer tools' },
    dark: true,
    palette: { bg: '10151B', panel: '161D26', fg: 'F5F7FA', muted: '8E9AAA', accent: '2F6BFF', accent2: 'FFB300' },
    fonts: { heading: 'Helvetica Neue', body: 'Helvetica Neue' },
  },
  velvet: {
    id: 'velvet',
    name: { zh: 'Velvet Standard', en: 'Velvet Standard' },
    mood: { zh: 'Premium, restrained, trustworthy', en: 'Premium, restrained, trustworthy' },
    bestFor: { zh: 'Executive decks / brand / investor pitches', en: 'Executive decks / brand / investor pitches' },
    dark: true,
    palette: { bg: '111316', panel: '1A1D22', fg: 'F4EFE6', muted: 'A79F91', accent: 'C9A84C', accent2: '3D4A63' },
    fonts: { heading: 'Georgia', body: 'Helvetica Neue' },
  },
  soft: {
    id: 'soft',
    name: { zh: 'Soft Signal', en: 'Soft Signal' },
    mood: { zh: 'Warm, intimate, human', en: 'Warm, intimate, human' },
    bestFor: { zh: 'Brand stories / training / personal talks', en: 'Brand stories / training / personal talks' },
    dark: false,
    palette: { bg: 'FFF8EC', panel: 'FFF2DE', fg: '3B2F2A', muted: '7E6F68', accent: 'E58A2F', accent2: '8FAF8C' },
    fonts: { heading: 'Avenir Next', body: 'Avenir Next' },
  },
  bold: {
    id: 'bold',
    name: { zh: 'Maximalist Type', en: 'Maximalist Type' },
    mood: { zh: 'Loud, kinetic, launch', en: 'Loud, kinetic, launch' },
    bestFor: { zh: 'Product launches / events / brand moments', en: 'Product launches / events / brand moments' },
    dark: true,
    palette: { bg: '0D0D0D', panel: '181818', fg: 'FFFFFF', muted: 'B8B8B8', accent: 'E63946', accent2: 'FFD60A' },
    fonts: { heading: 'Impact', body: 'Helvetica Neue' },
  },
}

export const THEME_IDS = Object.keys(THEMES)

export function resolveTheme(id?: string): Theme {
  const key = (id ?? 'data').trim().toLowerCase()
  return THEMES[key] ?? THEMES.data
}
