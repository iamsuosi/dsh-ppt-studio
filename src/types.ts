export type PptStudioThemeId = 'data' | 'swiss' | 'velvet' | 'soft' | 'bold'
export type PptStudioLanguage = 'zh' | 'en'

export interface PptStudioConfig {
  outputDir?: string
  defaultTheme?: PptStudioThemeId
  defaultLang?: PptStudioLanguage
  maxSlides?: number
}

export interface PptStudioCreateArgs {
  title: string
  content?: string
  theme?: PptStudioThemeId
  lang?: PptStudioLanguage
  outputDir?: string
  fileName?: string
  overwrite?: boolean
  maxSlides?: number
}

export interface PptStudioSlide {
  layout: 'cover' | 'section' | 'bullets' | 'statement' | 'closing'
  title: string
  subtitle?: string
  bullets?: string[]
}

export interface PptStudioDeckManifest {
  format: string
  title: string
  theme: PptStudioThemeId
  lang: PptStudioLanguage
  createdAt: string
  slideCount: number
  source?: { content: string }
  slides: Array<{ index: number; layout: PptStudioSlide['layout']; title: string; subtitle?: string; bullets?: string[] }>
}

/** One deck on disk, as the studio lists it. */
export interface PptStudioDeckEntry {
  name: string
  jsonPath: string
  htmlPath: string
  pptxPath: string
  title: string
  theme: PptStudioThemeId
  lang: PptStudioLanguage
  slideCount: number
  updatedAt: number
}

export interface PptStudioCreateResult {
  ok: boolean
  pptxPath: string
  htmlPath: string
  jsonPath: string
  slideCount: number
  theme: PptStudioThemeId
  lang: PptStudioLanguage
}

export interface PptStudioThemesResult {
  themes: Array<{
    id: PptStudioThemeId
    name: string
    mood: string
    bestFor: string
  }>
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
  output: {
    schema: Record<string, unknown>
    render: (args: unknown, value: unknown) => Array<{ type: 'text'; text: string }>
    presentationMeta?: (args: unknown, value: unknown) => unknown
  }
  execute: (args: any, exec: any) => Promise<any>
}
