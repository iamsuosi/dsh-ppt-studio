import { resolvePptStudioConfig } from './config.js'
import { buildTools } from './tools.js'
import { studioRoutes, type ConnectionLike } from './studio.js'
import type { PptStudioConfig, ToolDefinition } from './types.js'

export const name = 'dsh-ppt-studio'
// Only `tools` is required. `connection` exists only where a browser can reach the host (web / desktop),
// so the studio routes attach through ctx.inject below whenever it is present.
export const inject = ['tools']
export type Config = PptStudioConfig

export interface PluginContext {
  tools: { register(definition: ToolDefinition): () => void }
  logger?: { info?(message: string): void; warn?(message: string): void }
  on?(event: string, listener: () => void): () => void
  inject?(deps: string[], callback: (ctx: { connection: ConnectionLike }) => void): void
}

export function apply(ctx: PluginContext, config: Config = {}): void {
  const resolved = resolvePptStudioConfig(config)
  const disposers: Array<() => void> = []

  for (const definition of buildTools(resolved)) {
    disposers.push(ctx.tools.register(definition))
  }

  // Studio routes for the browser workbench; they live and die with the connection service.
  ctx.inject?.(['connection'], (scoped) => {
    for (const route of studioRoutes(resolved)) scoped.connection.fetch.register(route)
  })

  ctx.logger?.info?.('[dsh-ppt-studio] loaded')

  if (typeof ctx.on === 'function') {
    ctx.on('dispose', () => {
      for (const dispose of disposers) dispose()
    })
  }
}

export { resolvePptStudioConfig } from './config.js'
export { buildTools } from './tools.js'
export { parseMarkdownSlides, serializeSlides } from './parser.js'
export { writeDeckArtifacts, renderDeckHtml, renderDeckManifest, DECK_MANIFEST_FORMAT } from './engine.js'
export { listDecks, readDeck, buildDeck, studioRoutes } from './studio.js'
export type {
  PptStudioConfig,
  PptStudioCreateArgs,
  PptStudioCreateResult,
  PptStudioDeckEntry,
  PptStudioDeckManifest,
  PptStudioThemesResult,
  PptStudioSlide,
  PptStudioThemeId,
  PptStudioLanguage,
  ToolDefinition,
} from './types.js'
