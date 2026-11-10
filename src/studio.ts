/**
 * Host half of the studio: list, read and build decks for the browser workbench.
 * Exposed as exact fetch routes on the DSH connection (`/api/ppt-studio/*`); only the
 * owner's browser reaches them, authenticated by the host's session cookie.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { parseMarkdownSlides, serializeSlides } from './parser.js'
import { writeDeckArtifacts } from './engine.js'
import { DEFAULT_MAX_SLIDES, clampInt, outputDirFor, resolveLang, resolveOutputDir, resolveTheme } from './config.js'
import type { PptStudioConfig, PptStudioCreateResult, PptStudioDeckEntry, PptStudioDeckManifest, PptStudioLanguage, PptStudioThemeId } from './types.js'

export interface StudioDeck {
  entry: PptStudioDeckEntry
  manifest: PptStudioDeckManifest
  /** Markdown source: stored in the manifest, or rebuilt from its slides for older decks. */
  content: string
}

export interface BuildRequest {
  title: string
  content: string
  theme?: string
  lang?: string
  cwd?: string
  outputDir?: string
  fileName?: string
  overwrite?: boolean
  maxSlides?: number
}

function readManifest(jsonPath: string): PptStudioDeckManifest | null {
  try {
    const raw = JSON.parse(readFileSync(jsonPath, 'utf8'))
    // decks written before the format marker still carry title + slides
    if (!raw || typeof raw.title !== 'string' || !Array.isArray(raw.slides)) return null
    return raw as PptStudioDeckManifest
  } catch {
    return null
  }
}

function entryFor(jsonPath: string, manifest: PptStudioDeckManifest): PptStudioDeckEntry {
  const dir = dirname(jsonPath)
  const name = basename(jsonPath, '.json')
  return {
    name,
    jsonPath,
    htmlPath: join(dir, name + '.html'),
    pptxPath: join(dir, name + '.pptx'),
    title: manifest.title,
    theme: resolveTheme(manifest.theme),
    lang: resolveLang(manifest.lang),
    slideCount: manifest.slideCount ?? manifest.slides.length,
    updatedAt: statSync(jsonPath).mtimeMs,
  }
}

/** Decks in a directory, newest first. A deck is a JSON manifest with a sibling HTML file. */
export function listDecks(dir: string): PptStudioDeckEntry[] {
  if (!existsSync(dir)) return []
  const decks: PptStudioDeckEntry[] = []
  for (const file of readdirSync(dir)) {
    if (extname(file).toLowerCase() !== '.json') continue
    const jsonPath = join(dir, file)
    if (!existsSync(jsonPath.slice(0, -5) + '.html')) continue
    const manifest = readManifest(jsonPath)
    if (manifest) decks.push(entryFor(jsonPath, manifest))
  }
  return decks.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function readDeck(jsonPath: string): StudioDeck {
  const path = resolve(jsonPath)
  const manifest = readManifest(path)
  if (!manifest) throw new StudioError(404, 'not a deck manifest: ' + path)
  const content =
    manifest.source?.content ??
    serializeSlides(manifest.slides.map((s) => ({ layout: s.layout, title: s.title, subtitle: s.subtitle, bullets: s.bullets })))
  return { entry: entryFor(path, manifest), manifest, content }
}

export function buildDeck(config: Required<PptStudioConfig>, req: BuildRequest): PptStudioCreateResult & { deck: StudioDeck } {
  const title = String(req.title ?? '').trim()
  if (!title) throw new StudioError(400, 'title is required')
  const theme = resolveTheme(req.theme ?? config.defaultTheme)
  const lang = resolveLang(req.lang ?? config.defaultLang)
  const maxSlides = clampInt(req.maxSlides ?? config.maxSlides, DEFAULT_MAX_SLIDES, 3, 120)
  const outputDir = resolveOutputDir(config, req.outputDir, req.cwd)
  const content = String(req.content ?? '')
  const slides = parseMarkdownSlides(title, content).slice(0, maxSlides)
  const result = writeDeckArtifacts({ title, slides, theme, lang, outputDir, fileName: req.fileName, overwrite: req.overwrite === true, content })
  return { ...result, deck: readDeck(result.jsonPath) }
}

/** Where decks for a session workspace go, and the defaults the studio starts from. */
export function studioInfo(config: Required<PptStudioConfig>, cwd?: string) {
  return {
    outputDir: outputDirFor(config, undefined, cwd),
    configuredOutputDir: config.outputDir,
    defaultTheme: config.defaultTheme,
    defaultLang: config.defaultLang,
    maxSlides: config.maxSlides,
  }
}

export class StudioError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

// ---------------------------------------------------------------------------
// fetch routes
// ---------------------------------------------------------------------------

export interface FetchRoute {
  path: string
  methods: Array<'GET' | 'HEAD' | 'POST'>
  requestBody: 'buffered' | 'streaming'
  fetch(request: Request): Promise<Response>
}

export interface ConnectionLike {
  fetch: { register(route: FetchRoute): () => unknown }
}

export const STUDIO_ROUTE_PREFIX = '/api/ppt-studio'

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

function guard(handler: (request: Request) => unknown | Promise<unknown>) {
  return async (request: Request): Promise<Response> => {
    try {
      const value = await handler(request)
      return value instanceof Response ? value : json(value)
    } catch (error) {
      const status = error instanceof StudioError ? error.status : 500
      return json({ error: error instanceof Error ? error.message : String(error) }, status)
    }
  }
}

async function body<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T
  } catch {
    throw new StudioError(400, 'expected a JSON body')
  }
}

export function studioRoutes(config: Required<PptStudioConfig>): FetchRoute[] {
  const post = (name: string, handler: (request: Request) => unknown): FetchRoute => ({
    path: `${STUDIO_ROUTE_PREFIX}/${name}`,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: guard(handler),
  })
  return [
    post('info', async (r) => studioInfo(config, (await body<{ cwd?: string }>(r)).cwd)),
    post('decks', async (r) => {
      const { cwd, outputDir } = await body<{ cwd?: string; outputDir?: string }>(r)
      const dir = outputDirFor(config, outputDir, cwd)
      return { dir, decks: listDecks(dir) }
    }),
    post('deck', async (r) => readDeck(String((await body<{ path?: string }>(r)).path ?? ''))),
    post('build', async (r) => buildDeck(config, await body<BuildRequest>(r))),
    {
      // opened in a new browser tab: GET /api/ppt-studio/html?path=<deck .html or .json>
      path: `${STUDIO_ROUTE_PREFIX}/html`,
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: guard((r) => {
        const raw = new URL(r.url).searchParams.get('path') ?? ''
        const jsonPath = resolve(raw.replace(/\.html?$/i, '.json'))
        const deck = readDeck(jsonPath) // only serve HTML that sits next to one of our manifests
        return new Response(readFileSync(deck.entry.htmlPath), {
          headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
        })
      }),
    },
  ]
}

export type { PptStudioLanguage, PptStudioThemeId }
