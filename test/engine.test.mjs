import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseMarkdownSlides } from '../lib/parser.js'
import { writeDeckArtifacts, renderDeckHtml, renderDeckManifest } from '../lib/engine.js'
import { resolveTheme } from '../lib/themes.js'
import { resolvePptStudioConfig } from '../lib/config.js'
import { tmpdir } from 'node:os'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'

describe('config', () => {
  it('resolves defaults', () => {
    const cfg = resolvePptStudioConfig({})
    assert.equal(cfg.defaultTheme, 'data')
    assert.equal(cfg.defaultLang, 'zh')
    assert.equal(cfg.maxSlides, 30)
  })
})

describe('themes', () => {
  it('resolves valid theme', () => {
    const t = resolveTheme('swiss')
    assert.equal(t.id, 'swiss')
  })
  it('falls back to data for unknown theme', () => {
    const t = resolveTheme('unknown')
    assert.equal(t.id, 'data')
  })
})

describe('parser', () => {
  it('creates cover + slides + closing', () => {
    const slides = parseMarkdownSlides('Hello', '## A\n- one\n- two\n\n## B\n- three')
    assert.equal(slides.length, 4)
    assert.equal(slides[0].layout, 'cover')
    assert.equal(slides[1].layout, 'bullets')
    assert.equal(slides[3].layout, 'closing')
  })

  it('uses the leading paragraph as cover subtitle without repeating it', () => {
    const slides = parseMarkdownSlides('Deck', 'Intro line.\n\n## A\n- one')
    assert.equal(slides[0].subtitle, 'Intro line.')
    assert.deepEqual(slides.map((s) => s.layout), ['cover', 'bullets', 'closing'])
  })

  it('expands a single sentence into a 3-slide mini deck', () => {
    const slides = parseMarkdownSlides('Deck', 'Just one idea.')
    assert.deepEqual(slides.map((s) => s.layout), ['cover', 'statement', 'closing'])
  })

  it('ignores frontmatter when picking the cover subtitle', () => {
    const slides = parseMarkdownSlides('Deck', '---\nk: v\n---\nLead.\n\n## A\n- one')
    assert.equal(slides[0].subtitle, 'Lead.')
  })
})

describe('engine', () => {
  it('writes pptx + html + json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-ppt-studio-'))
    const result = writeDeckArtifacts({
      title: 'Smoke Test',
      slides: parseMarkdownSlides('Smoke Test', '## Topic\n- a\n- b'),
      theme: 'data',
      lang: 'en',
      outputDir: dir,
      overwrite: true,
    })
    assert.equal(result.ok, true)
    assert.equal(result.slideCount, 3)
    assert.match(result.pptxPath, /\.pptx$/)
    assert.match(result.htmlPath, /\.html$/)
    assert.match(result.jsonPath, /\.json$/)
    rmSync(dir, { recursive: true, force: true })
  })

  it('renders html', () => {
    const html = renderDeckHtml('Test', parseMarkdownSlides('Test', '## X\n- y'), resolveTheme('data'), 'en')
    assert.match(html, /Test/)
    assert.match(html, /X/)
  })

  it('renders manifest', () => {
    const manifest = renderDeckManifest('Test', parseMarkdownSlides('Test', '## X\n- y'), 'data', 'en')
    assert.equal(manifest.slideCount, 3)
  })
})
