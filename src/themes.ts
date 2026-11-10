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
    mood: { zh: '未来感、沉浸、前沿', en: 'Futuristic, immersive, cutting-edge' },
    bestFor: { zh: 'AI / 研究 / 技术发布', en: 'AI / research / tech launches' },
    dark: true,
    palette: { bg: '070B14', panel: '0D1424', fg: 'E8F1FF', muted: '7E8BA8', accent: '7C3AED', accent2: '06B6D4' },
    fonts: { heading: 'Space Grotesk', body: 'Segoe UI' },
  },
  swiss: {
    id: 'swiss',
    name: { zh: 'Swiss Pulse', en: 'Swiss Pulse' },
    mood: { zh: '精确、理性、数据驱动', en: 'Precise, rational, data-driven' },
    bestFor: { zh: 'SaaS / 数据 / 开发者工具', en: 'SaaS / data / developer tools' },
    dark: true,
    palette: { bg: '10151B', panel: '161D26', fg: 'F5F7FA', muted: '8E9AAA', accent: '2F6BFF', accent2: 'FFB300' },
    fonts: { heading: 'Helvetica Neue', body: 'Helvetica Neue' },
  },
  velvet: {
    id: 'velvet',
    name: { zh: 'Velvet Standard', en: 'Velvet Standard' },
    mood: { zh: '高级、克制、可信', en: 'Premium, restrained, trustworthy' },
    bestFor: { zh: '高管汇报 / 品牌 / 融资路演', en: 'Executive decks / brand / investor pitches' },
    dark: true,
    palette: { bg: '111316', panel: '1A1D22', fg: 'F4EFE6', muted: 'A79F91', accent: 'C9A84C', accent2: '3D4A63' },
    fonts: { heading: 'Georgia', body: 'Helvetica Neue' },
  },
  soft: {
    id: 'soft',
    name: { zh: 'Soft Signal', en: 'Soft Signal' },
    mood: { zh: '温暖、亲切、有人情味', en: 'Warm, intimate, human' },
    bestFor: { zh: '品牌故事 / 培训 / 个人分享', en: 'Brand stories / training / personal talks' },
    dark: false,
    palette: { bg: 'FFF8EC', panel: 'FFF2DE', fg: '3B2F2A', muted: '7E6F68', accent: 'E58A2F', accent2: '8FAF8C' },
    fonts: { heading: 'Avenir Next', body: 'Avenir Next' },
  },
  bold: {
    id: 'bold',
    name: { zh: 'Maximalist Type', en: 'Maximalist Type' },
    mood: { zh: '响亮、有冲击力', en: 'Loud, kinetic, launch' },
    bestFor: { zh: '产品发布 / 活动 / 品牌时刻', en: 'Product launches / events / brand moments' },
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
