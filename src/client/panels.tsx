import { h, Fragment, useEffect, useState } from './react.js'
import { Icon } from './icons.js'
import { SlideView } from './slide.js'
import { THEMES, THEME_IDS } from '../themes.js'
import type { PptStudioDeckEntry, PptStudioSlide, PptStudioThemeId } from '../types.js'

export const LAYOUT_NAME: Record<PptStudioSlide['layout'], string> = { cover: '封面', section: '章节', bullets: '要点', statement: '陈述', closing: '结尾' }

export function themeName(id: string): string {
  return THEMES[id]?.name.zh ?? id
}

function ago(ms: number): string {
  const s = Math.max(0, (Date.now() - ms) / 1000)
  if (s < 60) return '刚刚'
  if (s < 3600) return `${Math.floor(s / 60)} 分钟前`
  if (s < 86400) return `${Math.floor(s / 3600)} 小时前`
  return new Date(ms).toLocaleDateString()
}

/** Side-panel tab: the Markdown the deck is generated from, beside the live preview. */
export function SourceEditor(props: { content: string; slideCount: number; dirty: boolean; busy: boolean; onChange(v: string): void; onBuild(): void }) {
  return (
    <>
      <div className="pps-legend">
        <span>
          <code>#</code> 章节页
        </span>
        <span>
          <code>##</code> 内容页
        </span>
        <span>
          <code>-</code> 要点
        </span>
        <span>开头一段 → 封面副标题</span>
      </div>
      <textarea className="pps-src" spellCheck={false} aria-label="Markdown 源稿" value={props.content} onChange={(e) => props.onChange(e.target.value)} />
      <div className="pps-foot">
        <span>
          {props.content.split('\n').length} 行 · 解析为 {props.slideCount} 页
        </span>
        {props.dirty && (
          <button type="button" className="pps-btn sm accent" disabled={props.busy} onClick={props.onBuild}>
            <Icon name="refresh" size={14} />
            生成
          </button>
        )}
      </div>
    </>
  )
}

/** Header popover: the five themes, each previewed on this deck's cover. */
export function ThemeGallery(props: { cover: PptStudioSlide; total: number; theme: string; onPick(id: PptStudioThemeId): void }) {
  return (
    <div className="pps-tgrid">
      {THEME_IDS.map((id) => {
        const t = THEMES[id]
        return (
          <button key={id} type="button" className="pps-tcard" aria-pressed={props.theme === id} onClick={() => props.onPick(id as PptStudioThemeId)}>
            <SlideView slide={props.cover} index={0} total={props.total} theme={id as PptStudioThemeId} />
            <div>
              <div className="nm">
                {t.name.zh}
                {props.theme === id && <span className="pps-tag">使用中</span>}
              </div>
              <div className="md">{t.mood.zh}</div>
              <div className="bf">适合：{t.bestFor.zh}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

/** Header popover behind the deck title: decks in the output directory, and a new one. */
export function DeckMenu(props: {
  dir: string | null
  decks: PptStudioDeckEntry[]
  loading: boolean
  current?: string
  onOpen(path: string): void
  onNew(): void
  onRefresh(): void
  onOpenHtml(path: string): void
}) {
  return (
    <>
      <div className="pps-dir" title={props.dir ?? ''}>
        <Icon name="folder" size={13} />
        <span>{props.dir ?? '…'}</span>
        <span className="pps-grow" />
        <button type="button" className="pps-ibtn sm" aria-label="刷新" title="刷新" onClick={props.onRefresh}>
          <Icon name="refresh" size={13} />
        </button>
      </div>
      <div className="pps-decklist">
        {props.loading && props.decks.length === 0 && <div className="pps-empty">正在读取…</div>}
        {!props.loading && props.decks.length === 0 && <div className="pps-empty">这个目录里还没有生成过 deck。</div>}
        {props.decks.map((d) => (
          <div key={d.jsonPath} className={'pps-deckrow' + (d.jsonPath === props.current ? ' cur' : '')}>
            <button type="button" className="main" onClick={() => props.onOpen(d.jsonPath)} title={d.jsonPath}>
              <span className="sw">
                <i style={{ background: '#' + (THEMES[d.theme]?.palette.bg ?? '000') }} />
                <i style={{ background: '#' + (THEMES[d.theme]?.palette.accent ?? 'fff') }} />
              </span>
              <span className="tx">
                <b>{d.title}</b>
                <span>
                  {d.name} · {ago(d.updatedAt)} · {d.slideCount} 页
                </span>
              </span>
              {d.jsonPath === props.current && <span className="pps-tag">当前</span>}
            </button>
            <button type="button" className="pps-ibtn sm" aria-label="在新标签页打开 HTML" title="在新标签页打开 HTML" onClick={() => props.onOpenHtml(d.htmlPath)}>
              <Icon name="open" size={13} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="row" onClick={props.onNew}>
        <Icon name="plus" size={14} />
        新建 deck
      </button>
    </>
  )
}

export interface StudioSettings {
  outputDir: string
  maxSlides: number
}

/** Header popover: where decks go, language, slide cap. */
export function SettingsForm(props: {
  settings: StudioSettings
  resolvedDir: string | null
  lang: string
  theme: string
  onSettings(patch: Partial<StudioSettings>): void
  onLang(lang: 'zh' | 'en'): void
}) {
  const [dir, setDir] = useState(props.settings.outputDir)
  useEffect(() => setDir(props.settings.outputDir), [props.settings.outputDir])
  return (
    <div className="pps-form">
      <div className="pps-field">
        <label htmlFor="pps-dir">输出目录</label>
        <input
          id="pps-dir"
          className="pps-in mono"
          value={dir}
          placeholder={props.resolvedDir ?? '会话工作区'}
          onChange={(e) => setDir(e.target.value)}
          onBlur={() => dir !== props.settings.outputDir && props.onSettings({ outputDir: dir.trim() })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <div className="hint">留空则按插件配置写入；相对路径相对当前会话的工作区。只对在工作台里生成的 deck 生效。</div>
      </div>
      <div className="pps-field">
        <span className="lbl">语言</span>
        <div className="pps-seg" role="group" aria-label="语言">
          <button type="button" aria-pressed={props.lang === 'zh'} onClick={() => props.onLang('zh')}>
            中文
          </button>
          <button type="button" aria-pressed={props.lang === 'en'} onClick={() => props.onLang('en')}>
            English
          </button>
        </div>
      </div>
      <div className="pps-field">
        <label htmlFor="pps-max">页数上限</label>
        <input
          id="pps-max"
          className="pps-in"
          type="number"
          min={3}
          max={120}
          value={props.settings.maxSlides}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10)
            if (Number.isFinite(n)) props.onSettings({ maxSlides: Math.min(120, Math.max(3, n)) })
          }}
        />
        <div className="hint">范围 3–120，超出的页会被截掉。</div>
      </div>
      <div className="pps-field">
        <span className="lbl">插件默认配置</span>
        <pre className="pps-pre">{`- id: dsh-ppt-studio\n  config:\n    outputDir: ${props.settings.outputDir || './decks'}\n    defaultTheme: ${props.theme}\n    defaultLang: ${props.lang}\n    maxSlides: ${props.settings.maxSlides}`}</pre>
        <div className="hint">写进 DSH profile 的 cordis.patch.yml，改变助手调用工具时的默认值。</div>
      </div>
    </div>
  )
}

/** Side-panel tab: the selected slide's layout, title and body, written back into the source. */
export function Inspector(props: { slide: PptStudioSlide | undefined; index: number; onChange(slide: PptStudioSlide): void }) {
  const s = props.slide
  // Fields keep their own text: a blank line or an emptied title would vanish if every keystroke round-tripped through the parser.
  const [title, setTitle] = useState(s?.title ?? '')
  const [body, setBody] = useState('')
  const list = s?.layout === 'bullets'
  const key = `${props.index}:${s?.layout}`
  useEffect(() => {
    setTitle(s?.title ?? '')
    setBody(list ? (s?.bullets ?? []).join('\n') : s?.subtitle ?? '')
  }, [key])
  if (!s) return <div className="pps-empty">没有选中的页。</div>
  const cover = props.index === 0 && s.layout === 'cover'
  return (
    <div className="pps-scroll">
      <div className="pps-form">
        <div className="pps-field">
          <label htmlFor="pps-layout">版式</label>
          <select
            id="pps-layout"
            className="pps-in"
            value={s.layout}
            disabled={cover}
            onChange={(e) => {
              const layout = e.target.value as PptStudioSlide['layout']
              const next: PptStudioSlide = { ...s, layout }
              if (layout === 'bullets' && !next.bullets?.length) next.bullets = s.subtitle ? [s.subtitle] : ['要点']
              if (layout !== 'bullets' && !next.subtitle && s.bullets?.length) next.subtitle = s.bullets[0]
              props.onChange(next)
            }}
          >
            {(Object.keys(LAYOUT_NAME) as Array<PptStudioSlide['layout']>)
              // only layouts the Markdown source can express survive the write-back
              .filter((k) => k === s.layout || k === 'section' || k === 'bullets' || k === 'statement')
              .map((k) => (
                <option key={k} value={k}>
                  {LAYOUT_NAME[k]}
                </option>
              ))}
          </select>
          <div className="hint">第 {props.index + 1} 页。改动会写回源稿。{cover ? '封面标题就是 deck 标题。' : ''}</div>
        </div>
        <div className="pps-field">
          <label htmlFor="pps-ptitle">标题</label>
          <input
            id="pps-ptitle"
            className="pps-in"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              const t = e.target.value.trim()
              if (t) props.onChange({ ...s, title: t })
            }}
          />
          {!title.trim() && <div className="hint">标题不能为空。</div>}
        </div>
        <div className="pps-field">
          <label htmlFor="pps-pbody">{list ? '要点（每行一条）' : '副标题'}</label>
          <textarea
            id="pps-pbody"
            className="pps-in"
            rows={list ? 6 : 3}
            value={body}
            onChange={(e) => {
              setBody(e.target.value)
              const v = e.target.value
              props.onChange(
                list
                  ? { ...s, bullets: v.split('\n').map((b) => b.trim()).filter(Boolean) }
                  : { ...s, subtitle: v.replace(/\s*\n\s*/g, ' ').trim() },
              )
            }}
          />
        </div>
      </div>
    </div>
  )
}
