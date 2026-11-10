import { parseMarkdownSlides } from './parser.js'
import { writeDeckArtifacts } from './engine.js'
import { resolveOutputDir, resolveTheme, resolveLang, clampInt } from './config.js'
import { DEFAULT_MAX_SLIDES, DEFAULT_THEME, DEFAULT_LANG } from './config.js'
import type { PptStudioConfig, PptStudioCreateArgs, PptStudioCreateResult, PptStudioThemesResult, ToolDefinition } from './types.js'
import { THEMES, THEME_IDS } from './themes.js'

function oneText(text: string): Array<{ type: 'text'; text: string }> {
  return [{ type: 'text', text }]
}

function renderCreate(value: PptStudioCreateResult): Array<{ type: 'text'; text: string }> {
  return oneText(
    'PPT Studio generated ' + value.slideCount + ' slides (theme ' + value.theme + ', language ' + value.lang + '):\n' +
    'HTML: ' + value.htmlPath + '\n' +
    'PPTX: ' + value.pptxPath + '\n' +
    'JSON: ' + value.jsonPath,
  )
}

function renderThemes(value: PptStudioThemesResult): Array<{ type: 'text'; text: string }> {
  const lines = value.themes.map((theme) => '- ' + theme.id + ': ' + theme.name + ' | ' + theme.mood + ' | Best for: ' + theme.bestFor)
  return oneText('Built-in themes:\n\n' + lines.join('\n') + '\n\nUse a theme id as the theme argument of ppt_studio_create.')
}

const createResultSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    pptxPath: { type: 'string' },
    htmlPath: { type: 'string' },
    jsonPath: { type: 'string' },
    slideCount: { type: 'integer' },
    theme: { type: 'string' },
    lang: { type: 'string' },
  },
  additionalProperties: true,
}

const themesResultSchema: Record<string, unknown> = {
  type: 'object',
  properties: {
    themes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          mood: { type: 'string' },
          bestFor: { type: 'string' },
        },
        additionalProperties: true,
      },
    },
  },
  additionalProperties: true,
}

export function buildTools(config: Required<PptStudioConfig>): ToolDefinition[] {
  return [
    {
      name: 'ppt_studio_create',
      description:
        'Create a presentation from a title and Markdown content. Returns paths to the generated PPTX, HTML, and JSON manifest.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Presentation title' },
          content: { type: 'string', description: 'Markdown outline with # and ## headings and bullet lists' },
          theme: { type: 'string', enum: THEME_IDS, description: 'Visual theme id' },
          lang: { type: 'string', enum: ['zh', 'en'], description: 'Language for UI labels' },
          outputDir: { type: 'string', description: 'Optional output directory' },
          fileName: { type: 'string', description: 'Optional base file name (without extension)' },
          overwrite: { type: 'boolean', description: 'Replace an existing deck with the same fileName instead of writing a numbered copy. Use when revising a deck the user has open in PPT Studio.' },
          maxSlides: { type: 'number', description: 'Safety cap for slide count' },
        },
        required: ['title'],
      },
      output: {
        schema: createResultSchema,
        render: (_args: unknown, value: unknown) => renderCreate(value as PptStudioCreateResult),
        // replayed with the tool/result so the chat card and PPT Studio can open the deck
        presentationMeta: (args: unknown, value: unknown) => {
          const v = value as PptStudioCreateResult
          return { title: String((args as PptStudioCreateArgs)?.title ?? ''), jsonPath: v.jsonPath, htmlPath: v.htmlPath, pptxPath: v.pptxPath, slideCount: v.slideCount, theme: v.theme, lang: v.lang }
        },
      },
      execute: async (args: PptStudioCreateArgs, exec: any): Promise<PptStudioCreateResult> => {
        const cwd: string = exec?.agent?.session?.meta?.cwd ?? process.cwd()
        const theme = resolveTheme(args.theme ?? config.defaultTheme)
        const lang = resolveLang(args.lang ?? config.defaultLang)
        const maxSlides = clampInt(args.maxSlides ?? config.maxSlides, DEFAULT_MAX_SLIDES, 3, 120)
        const outputDir = resolveOutputDir(config, args.outputDir, cwd)

        const slides = parseMarkdownSlides(args.title, args.content).slice(0, maxSlides)
        if (slides.length === 0) {
          throw new Error('dsh-ppt-studio: no slides could be generated from the input.')
        }

        return writeDeckArtifacts({
          title: args.title,
          slides,
          theme,
          lang,
          outputDir,
          fileName: args.fileName,
          overwrite: args.overwrite === true,
          content: args.content ?? '',
        })
      },
    },
    {
      name: 'ppt_studio_themes',
      description: 'List the built-in visual themes available for ppt_studio_create.',
      parameters: {
        type: 'object',
        properties: {
          lang: { type: 'string', enum: ['zh', 'en'], description: 'Language for theme names' },
        },
      },
      output: { schema: themesResultSchema, render: (_args: unknown, value: unknown) => renderThemes(value as PptStudioThemesResult) },
      execute: async (args: { lang?: 'zh' | 'en' }): Promise<PptStudioThemesResult> => {
        const lang = resolveLang(args.lang ?? config.defaultLang)
        const pick = (pair: { zh: string; en: string }) => (lang === 'en' ? pair.en : pair.zh)
        return {
          themes: THEME_IDS.map((id) => {
            const t = THEMES[id]
            return { id: id as any, name: pick(t.name), mood: pick(t.mood), bestFor: pick(t.bestFor) }
          }),
        }
      },
    },
  ]
}
