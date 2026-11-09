import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { PptStudioConfig, PptStudioLanguage, PptStudioThemeId } from './types.js'

export const DEFAULT_THEME: PptStudioThemeId = 'data'
export const DEFAULT_LANG: PptStudioLanguage = 'zh'
export const DEFAULT_MAX_SLIDES = 30
export const DSH_PPT_STUDIO_OUTPUT_DIR_ENV = 'DSH_PPT_STUDIO_OUTPUT_DIR'

const VALID_THEMES: PptStudioThemeId[] = ['data', 'swiss', 'velvet', 'soft', 'bold']
const VALID_LANGS: PptStudioLanguage[] = ['zh', 'en']

export function resolveTheme(input?: string): PptStudioThemeId {
  const id = (input ?? DEFAULT_THEME).trim().toLowerCase() as PptStudioThemeId
  if (!VALID_THEMES.includes(id)) return DEFAULT_THEME
  return id
}

export function resolveLang(input?: string): PptStudioLanguage {
  const id = (input ?? DEFAULT_LANG).trim().toLowerCase() as PptStudioLanguage
  if (!VALID_LANGS.includes(id)) return DEFAULT_LANG
  return id
}

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === 'number' ? Math.trunc(value) : fallback
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function resolveOutputDir(config?: PptStudioConfig, arg?: string, cwd?: string): string {
  const fromEnv = process.env[DSH_PPT_STUDIO_OUTPUT_DIR_ENV]
  const dir = arg || fromEnv || config?.outputDir || (cwd ?? process.cwd())
  const resolved = resolve(dir)
  mkdirSync(resolved, { recursive: true })
  return resolved
}

export function resolvePptStudioConfig(config: PptStudioConfig = {}): Required<PptStudioConfig> {
  return {
    outputDir: config.outputDir ?? process.cwd(),
    defaultTheme: resolveTheme(config.defaultTheme),
    defaultLang: resolveLang(config.defaultLang),
    maxSlides: clampInt(config.maxSlides, DEFAULT_MAX_SLIDES, 3, 120),
  }
}
