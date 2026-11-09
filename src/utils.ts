import { readdirSync } from 'node:fs'

const WINDOWS_RESERVED_FILE_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i
const DECK_ARTIFACT_EXTENSIONS = ['.html', '.pptx', '.json']

export function sanitizeFileName(input?: string): string {
  const base = String(input ?? 'deck').trim().replace(/[\uFFFE\uFFFF]/g, '-').replace(/\.(html?|pptx|json)$/i, '')
  let cleaned = base
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (WINDOWS_RESERVED_FILE_NAME.test(cleaned)) cleaned = 'deck-' + cleaned
  return cleaned.slice(0, 120) || 'deck'
}

export function resolveDeckFileName(outputDir: string, requestedFileName: string, overwrite: boolean): string {
  const existing = new Set(readdirSync(outputDir).map((name) => name.toLowerCase()))
  const isAvailable = (candidate: string) =>
    DECK_ARTIFACT_EXTENSIONS.every((ext) => !existing.has((candidate + ext).toLowerCase()))
  if (overwrite || isAvailable(requestedFileName)) return requestedFileName
  for (let index = 1; index < 1000; index += 1) {
    const candidate = requestedFileName + '-' + index
    if (isAvailable(candidate)) return candidate
  }
  throw new Error('dsh-ppt-studio: cannot find an available file name prefix.')
}
