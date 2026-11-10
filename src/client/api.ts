import type { PptStudioDeckEntry, PptStudioDeckManifest, PptStudioCreateResult } from '../types.js'

/** Calls the host routes registered by src/studio.ts. Relative URLs keep mounted deployments working. */
const BASE = 'api/ppt-studio/'

export interface StudioInfo {
  outputDir: string
  configuredOutputDir: string
  defaultTheme: string
  defaultLang: string
  maxSlides: number
}

export interface StudioDeck {
  entry: PptStudioDeckEntry
  manifest: PptStudioDeckManifest
  content: string
}

export interface BuildArgs {
  title: string
  content: string
  theme: string
  lang: string
  cwd?: string
  outputDir?: string
  fileName?: string
  overwrite?: boolean
  maxSlides?: number
}

async function call<T>(route: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(BASE + route, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
      credentials: 'same-origin',
      signal,
    })
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    throw new Error('无法连接 DSH 服务')
  }
  const text = await response.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // not JSON
  }
  if (!response.ok) {
    if (response.status === 404 && !data) throw new Error('DSH 服务端还没有加载 PPT Studio 接口，请重启 DSH')
    throw new Error(data?.error || `请求失败（HTTP ${response.status}）`)
  }
  return data as T
}

export const api = {
  info: (cwd: string | undefined, signal?: AbortSignal) => call<StudioInfo>('info', { cwd }, signal),
  decks: (cwd: string | undefined, outputDir: string | undefined, signal?: AbortSignal) =>
    call<{ dir: string; decks: PptStudioDeckEntry[] }>('decks', { cwd, outputDir: outputDir || undefined }, signal),
  deck: (path: string, signal?: AbortSignal) => call<StudioDeck>('deck', { path }, signal),
  build: (args: BuildArgs) => call<PptStudioCreateResult & { deck: StudioDeck }>('build', args),
  htmlUrl: (path: string) => BASE + 'html?path=' + encodeURIComponent(path),
}
