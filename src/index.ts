import { resolvePptStudioConfig } from './config.js'
import { buildTools } from './tools.js'
import type { PptStudioConfig, ToolDefinition } from './types.js'

export const name = 'dsh-ppt-studio'
export const inject = ['tools']
export type Config = PptStudioConfig

export interface PluginContext {
  tools: { register(definition: ToolDefinition): () => void }
  logger?: { info?(message: string): void; warn?(message: string): void }
  on?(event: string, listener: () => void): () => void
}

export function apply(ctx: PluginContext, config: Config = {}): void {
  const resolved = resolvePptStudioConfig(config)
  const disposers: Array<() => void> = []

  for (const definition of buildTools(resolved)) {
    disposers.push(ctx.tools.register(definition))
  }

  ctx.logger?.info?.('[dsh-ppt-studio] loaded')

  if (typeof ctx.on === 'function') {
    ctx.on('dispose', () => {
      for (const dispose of disposers) dispose()
    })
  }
}

export { resolvePptStudioConfig } from './config.js'
export { buildTools } from './tools.js'
export { parseMarkdownSlides } from './parser.js'
export { writeDeckArtifacts, renderDeckHtml, renderDeckManifest } from './engine.js'
export type {
  PptStudioConfig,
  PptStudioCreateArgs,
  PptStudioCreateResult,
  PptStudioThemesResult,
  PptStudioSlide,
  PptStudioThemeId,
  PptStudioLanguage,
  ToolDefinition,
} from './types.js'
