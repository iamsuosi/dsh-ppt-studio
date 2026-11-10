import { h, Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from './react.js'
import { Icon, type IconName } from './icons.js'
import { SlideView } from './slide.js'
import { api, type StudioDeck, type StudioInfo } from './api.js'
import { onOpenDeck, consumeOpenDeck } from './bus.js'
import { currentSessionId, type Host, type SessionList } from './host.js'
import { clampSize, LIMITS, useLayout, type Layout, type SideTab } from './layout.js'
import { AssistantPane, type DeckContext, type DeckResultMeta } from './assistant.js'
import { DeckMenu, Inspector, LAYOUT_NAME, SettingsForm, SourceEditor, ThemeGallery, themeName, type StudioSettings } from './panels.js'
import { parseMarkdownSlides, serializeSlides } from '../parser.js'
import { THEMES } from '../themes.js'
import type { PptStudioDeckEntry, PptStudioSlide, PptStudioThemeId } from '../types.js'

/** The deck being edited: a working copy of what is (or will be) on disk. */
interface Doc {
  title: string
  content: string
  theme: PptStudioThemeId
  lang: 'zh' | 'en'
  jsonPath?: string
  name?: string
}
type Saved = Pick<Doc, 'title' | 'content' | 'theme' | 'lang'> & { at: number }

const STARTER = `一句话说明这份演示要讲什么。

## 背景
- 现状是什么
- 为什么现在要讲

## 核心观点
- 观点一
- 观点二
- 观点三

## 下一步
- 需要大家做什么`

const SETTINGS_KEY = 'dsh-ppt-studio:settings'
function loadSettings(): StudioSettings {
  try {
    const raw = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || 'null')
    return {
      outputDir: typeof raw?.outputDir === 'string' ? raw.outputDir : '',
      maxSlides: Number.isFinite(raw?.maxSlides) ? Math.min(120, Math.max(3, raw.maxSlides)) : 30,
    }
  } catch {
    return { outputDir: '', maxSlides: 30 }
  }
}

const NARROW = 820 // keep in sync with the @container query in styles.ts

type PopKind = 'decks' | 'themes' | 'settings' | 'export' | 'help'
const POP_WIDTH: Record<PopKind, number> = { decks: 380, themes: 460, settings: 340, export: 320, help: 250 }
const POP_LABEL: Record<PopKind, string> = { decks: '打开或新建 deck', themes: '主题', settings: '设置', export: '导出', help: '快捷键' }
const SIDE_TAB_LABELS: Array<{ id: SideTab; label: string; icon: IconName }> = [
  { id: 'assistant', label: '助手', icon: 'msg' },
  { id: 'source', label: '源稿', icon: 'code' },
  { id: 'page', label: '本页', icon: 'edit' },
]
const asTheme = (id: string | undefined): PptStudioThemeId => (id && THEMES[id] ? (id as PptStudioThemeId) : 'data')
const asLang = (id: string | undefined): 'zh' | 'en' => (id === 'en' ? 'en' : 'zh')

function docFromDeck(deck: StudioDeck): Doc {
  return {
    title: deck.manifest.title,
    content: deck.content,
    theme: asTheme(deck.manifest.theme),
    lang: asLang(deck.manifest.lang),
    jsonPath: deck.entry.jsonPath,
    name: deck.entry.name,
  }
}

function gridVars(layout: Layout): Record<string, string> {
  return {
    '--pps-cols': `minmax(0,1fr) ${layout.right ? layout.rightWidth : 0}px`,
    '--pps-rows': `3rem minmax(0,1fr) ${layout.bottom ? layout.stripHeight + 'px' : '2.75rem'}`,
    '--pps-strip-n': layout.bottom ? '128px' : '2.75rem',
  }
}

const emptyList: SessionList = { byId: {} }

export function Studio(props: { host: Host }) {
  const { host } = props
  const root = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const [stored, setLayout] = useLayout()
  const [narrow, setNarrow] = useState(false)
  // In a narrow panel the side panel is a drawer over the stage, closed by default.
  // Its open state lives here, so it never overwrites the wide arrangement kept in storage.
  const [drawer, setDrawer] = useState(false)
  const layout: Layout = narrow ? { ...stored, right: drawer } : stored
  const rightTab = layout.rightTab

  // ---- current session & workspace ----
  const list = useSyncExternalStore(
    (l) => host.sessions?.list?.subscribe(l) ?? (() => {}),
    () => host.sessions?.list?.getSnapshot() ?? emptyList,
  )
  const sessionId = currentSessionId(list)
  const session = sessionId ? list.byId[sessionId] : undefined
  const cwd = session?.cwd

  // ---- data ----
  const [settings, setSettingsState] = useState<StudioSettings>(loadSettings)
  const [info, setInfo] = useState<StudioInfo | null>(null)
  const [dir, setDir] = useState<string | null>(null)
  const [decks, setDecks] = useState<PptStudioDeckEntry[]>([])
  const [loadingDecks, setLoadingDecks] = useState(false)
  const [doc, setDoc] = useState<Doc | null>(null)
  const [saved, setSaved] = useState<Saved | null>(null)
  const [sel, setSel] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [pop, setPop] = useState<{ kind: PopKind; x: number; y: number } | null>(null)
  const [present, setPresent] = useState(false)
  const [focusRequest, setFocusRequest] = useState(0)
  const [draft, setDraft] = useState<{ text: string; n: number } | null>(null)
  const scrollToSel = useRef(false)

  const slides = useMemo(
    () => (doc ? parseMarkdownSlides(doc.title || '未命名', doc.content).slice(0, settings.maxSlides) : []),
    [doc?.title, doc?.content, settings.maxSlides],
  )
  const dirty = !!doc && (!saved || saved.title !== doc.title || saved.content !== doc.content || saved.theme !== doc.theme || saved.lang !== doc.lang)
  const current = slides[Math.min(sel, slides.length - 1)]

  const flash = useCallback((message: string) => setToast(message), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (sel > slides.length - 1) setSel(Math.max(0, slides.length - 1))
  }, [slides.length])

  const setSettings = (patch: Partial<StudioSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch }
      try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
      } catch {
        // kept for this page only
      }
      return next
    })
  }

  const confirmDiscard = () => !dirty || window.confirm('当前的改动还没有生成，确定放弃吗？')

  const applyDeck = (deck: StudioDeck) => {
    const next = docFromDeck(deck)
    setDoc(next)
    setSaved({ title: next.title, content: next.content, theme: next.theme, lang: next.lang, at: deck.entry.updatedAt })
    setError(null)
  }

  const refreshDecks = useCallback(
    async (signal?: AbortSignal) => {
      setLoadingDecks(true)
      try {
        const res = await api.decks(cwd, settings.outputDir, signal)
        setDir(res.dir)
        setDecks(res.decks)
        return res.decks
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError((e as Error).message)
        return null
      } finally {
        setLoadingDecks(false)
      }
    },
    [cwd, settings.outputDir],
  )

  const openDeck = useCallback(
    async (path: string, opts: { force?: boolean; quiet?: boolean } = {}) => {
      if (!opts.force && path !== doc?.jsonPath && !confirmDiscard()) return
      try {
        const deck = await api.deck(path)
        applyDeck(deck)
        setSel(0)
        scrollToSel.current = true
        if (!opts.quiet) flash('已打开 ' + deck.entry.name)
      } catch (e) {
        setError((e as Error).message)
      }
    },
    [doc?.jsonPath, dirty],
  )

  const newDeck = () => {
    if (!confirmDiscard()) return
    setDoc({ title: '新的演示文稿', content: STARTER, theme: asTheme(info?.defaultTheme), lang: asLang(info?.defaultLang) })
    setSaved(null)
    setSel(0)
    setPop(null)
    patchLayout({ right: true, rightTab: 'source' })
  }

  // whether something already decided which deck to show (a chat card request, a click); the first load then leaves it alone
  const chosen = useRef(false)

  // first load for this workspace: studio info, deck list, then the newest deck (or a starter draft)
  useEffect(() => {
    const ctrl = new AbortController()
    ;(async () => {
      let fetched: StudioInfo | null = null
      try {
        fetched = await api.info(cwd, ctrl.signal)
        setInfo(fetched)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError((e as Error).message)
      }
      const list = await refreshDecks(ctrl.signal)
      if (ctrl.signal.aborted || chosen.current) return
      chosen.current = true
      if (list?.[0]) await openDeck(list[0].jsonPath, { force: true, quiet: true })
      else setDoc({ title: '新的演示文稿', content: STARTER, theme: asTheme(fetched?.defaultTheme), lang: asLang(fetched?.defaultLang) })
    })()
    return () => ctrl.abort()
  }, [cwd, settings.outputDir])

  // "open in PPT Studio" from the chat's tool card
  useEffect(
    () =>
      onOpenDeck((path) => {
        chosen.current = true
        consumeOpenDeck(path)
        void openDeck(path, { force: true })
        void refreshDecks()
      }),
    [openDeck, refreshDecks],
  )

  const build = async () => {
    if (!doc || busy) return
    if (!doc.title.trim()) return setError('先给 deck 起个标题')
    setBusy(true)
    setError(null)
    try {
      const res = await api.build({
        title: doc.title.trim(),
        content: doc.content,
        theme: doc.theme,
        lang: doc.lang,
        cwd,
        outputDir: settings.outputDir || undefined,
        fileName: doc.name,
        overwrite: Boolean(doc.name),
        maxSlides: settings.maxSlides,
      })
      applyDeck(res.deck)
      void refreshDecks()
      flash(`已生成 ${res.slideCount} 页 · ${res.deck.entry.name}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const revert = () => {
    if (!saved || !doc) return
    setDoc({ ...doc, title: saved.title, content: saved.content, theme: saved.theme, lang: saved.lang })
  }

  const onDeckResult = (meta: DeckResultMeta) => {
    if (!meta.jsonPath) return
    void refreshDecks()
    void openDeck(meta.jsonPath, { force: true, quiet: true }).then(() => flash('已载入助手生成的新版本'))
  }

  const select = (i: number) => {
    setSel(Math.max(0, Math.min(slides.length - 1, i)))
    scrollToSel.current = true
  }

  const editSlide = (slide: PptStudioSlide) => {
    if (!doc) return
    const next = slides.slice()
    next[sel] = slide
    setDoc({ ...doc, title: sel === 0 && slide.layout === 'cover' ? slide.title : doc.title, content: serializeSlides(next) })
  }

  const copy = (text: string) => {
    const done = () => flash('已复制路径')
    try {
      navigator.clipboard.writeText(text).then(done, () => flash(text))
    } catch {
      flash(text)
    }
  }
  const openHtml = (path: string) => window.open(api.htmlUrl(path), '_blank', 'noopener')

  const patchLayout = (patch: Partial<Layout>) => {
    if (narrow) {
      const { right, ...rest } = patch
      if (right !== undefined) setDrawer(right)
      if (Object.keys(rest).length) setLayout(rest)
      return
    }
    setLayout(patch)
  }
  const showTab = (tab: SideTab) => patchLayout({ right: true, rightTab: tab })
  const askAboutPage = () => {
    showTab('assistant')
    setFocusRequest((n) => n + 1)
  }

  // narrow mode follows the panel's own width
  useLayoutEffect(() => {
    const el = root.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setNarrow(el.clientWidth <= NARROW))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    if (!narrow) setDrawer(false)
  }, [narrow])

  // keep the selected thumbnail in view
  useEffect(() => {
    if (!scrollToSel.current) return
    scrollToSel.current = false
    const film = root.current?.querySelector<HTMLElement>('.pps-film')
    const cur = film?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!film || !cur) return
    const l = cur.offsetLeft - film.offsetLeft
    const r = l + cur.offsetWidth
    if (l < film.scrollLeft) film.scrollLeft = l - 12
    else if (r > film.scrollLeft + film.clientWidth) film.scrollLeft = r - film.clientWidth + 12
  })

  // keyboard: only while focus is in the studio (or nowhere in particular)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement
      const inside = root.current?.contains(active) || active === document.body
      if (!inside && !present) return
      if (e.key === 'Escape') {
        if (present) setPresent(false)
        else if (pop) setPop(null)
        return
      }
      const t = e.target as HTMLElement | null
      const typing = !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (present && e.key === ' ')) {
        e.preventDefault()
        select(sel + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        select(sel - 1)
      } else if (present) {
        return
      } else if (e.key === ']') patchLayout({ right: !layout.right })
      else if (e.key === '\\') patchLayout({ bottom: !layout.bottom })
      else if (e.key === 'p' || e.key === 'P') setPresent(true)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const openPop = (kind: PopKind, target: HTMLElement) => {
    if (pop?.kind === kind) return setPop(null)
    const r = target.getBoundingClientRect()
    const f = root.current!.getBoundingClientRect()
    const w = Math.min(POP_WIDTH[kind], f.width - 16)
    // the deck menu hangs from the title on the left; the rest align to their button's right edge
    const x = kind === 'decks' ? r.left - f.left : r.right - f.left - w
    setPop({ kind, x: Math.max(8, Math.min(x, f.width - w - 8)), y: r.bottom - f.top + 6 })
  }
  useEffect(() => {
    if (!pop) return
    const close = (e: PointerEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest('.pps-pop') && !t.closest('[data-pop]')) setPop(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [pop])

  const deckContext: DeckContext = {
    title: doc?.title ?? '',
    content: doc?.content ?? '',
    theme: doc?.theme ?? 'data',
    lang: doc?.lang ?? 'zh',
    name: doc?.name,
    jsonPath: doc?.jsonPath,
    slides,
    sel,
  }
  const currentEntry = decks.find((d) => d.jsonPath === doc?.jsonPath)

  if (!doc) {
    return (
      <div className="pps" ref={root}>
        <div className="pps-empty" style={{ height: '100%', justifyContent: 'center' }}>
          {error ? <span style={{ color: 'var(--pps-error)' }}>{error}</span> : '正在打开 PPT Studio…'}
        </div>
      </div>
    )
  }

  const theme = THEMES[doc.theme]
  const stripThumbWidth = Math.round(((narrow ? 128 : layout.stripHeight) - 40 - 20 - 30) * (16 / 9))
  const statusPill = !saved ? (
    <span className="pps-pill muted" title="还没有生成过文件">
      <i />
      <span className="pps-wide">未生成</span>
    </span>
  ) : dirty ? (
    <span className="pps-pill warn" title="源稿、主题或标题有改动，还没有重新生成">
      <i />
      <span className="pps-wide">有改动未生成</span>
    </span>
  ) : (
    <span className="pps-pill ok" title={doc.jsonPath}>
      <i />
      <span className="pps-wide">已生成</span>
    </span>
  )

  return (
    <div className="pps" ref={root}>
      <div ref={grid} className="pps-grid" style={gridVars(layout)}>
        {/* header */}
        <header className="pps-hdr">
          <div className="pps-brand" title="PPT Studio">
            <div className="pps-logo">
              <Icon name="slides" size={14} />
            </div>
          </div>
          <input className="pps-title" value={doc.title} aria-label="演示文稿标题" placeholder="未命名" onChange={(e) => setDoc({ ...doc, title: e.target.value })} />
          <button
            type="button"
            className="pps-btn ghost"
            data-pop="decks"
            aria-expanded={pop?.kind === 'decks'}
            title="打开其他 deck 或新建"
            onClick={(e) => {
              void refreshDecks()
              openPop('decks', e.currentTarget)
            }}
          >
            <Icon name="folder" size={14} />
            <span className="lb">{decks.length ? `${decks.length} 份` : '文件'}</span>
            <Icon name="chevD" size={12} />
          </button>
          {statusPill}
          <div className="pps-hdr-right">
            <button type="button" className="pps-chip" data-pop="themes" aria-expanded={pop?.kind === 'themes'} title="切换主题" onClick={(e) => openPop('themes', e.currentTarget)}>
              <span className="pps-sw">
                {(['bg', 'accent', 'accent2'] as const).map((k) => (
                  <i key={k} style={{ background: '#' + theme.palette[k] }} />
                ))}
              </span>
              <span className="nm">{theme.name.zh}</span>
            </button>
            {(dirty || !saved) && (
              <button type="button" className="pps-btn accent" disabled={busy} onClick={() => void build()}>
                <Icon name="refresh" size={14} />
                <span className="lb">{busy ? '生成中…' : '生成'}</span>
              </button>
            )}
            <button type="button" className="pps-btn" data-pop="export" disabled={!doc.jsonPath} onClick={(e) => openPop('export', e.currentTarget)}>
              <Icon name="download" size={14} />
              <span className="lb">导出</span>
            </button>
            <button type="button" className="pps-btn primary" onClick={() => setPresent(true)}>
              <Icon name="play" size={13} />
              <span className="lb">演示</span>
            </button>
            <span className="pps-vsep" />
            <IconButton icon="sliders" label="设置" dataPop="settings" pressed={pop?.kind === 'settings'} onClick={(e) => openPop('settings', e.currentTarget)} />
            <span className="pps-wide" style={{ display: 'contents' }}>
              <IconButton icon="help" label="快捷键" dataPop="help" onClick={(e) => openPop('help', e.currentTarget)} />
              <IconButton icon="panelB" label="开关幻灯片条 \" pressed={layout.bottom} onClick={() => patchLayout({ bottom: !layout.bottom })} />
            </span>
            <IconButton icon="panelR" label="开关侧栏 ]" pressed={layout.right} onClick={() => patchLayout({ right: !layout.right })} />
          </div>
        </header>

        {/* stage */}
        <main className="pps-sheet pps-stage" aria-label="预览">
          {error ? (
            <div className="pps-banner err" role="alert">
              <span>{error}</span>
              <button type="button" className="pps-btn sm" onClick={() => setError(null)}>
                知道了
              </button>
            </div>
          ) : dirty && saved ? (
            <div className="pps-banner">
              <Icon name="edit" size={14} />
              <span>预览是草稿，和已生成的文件不一致</span>
              <button type="button" className="pps-btn sm" disabled={busy} onClick={() => void build()}>
                {busy ? '生成中…' : '重新生成'}
              </button>
              <button type="button" className="pps-btn sm" onClick={revert}>
                放弃改动
              </button>
            </div>
          ) : null}
          <div className="pps-canvas">
            <div className="pps-tools" role="toolbar" aria-label="画布工具">
              <IconButton icon="msg" label="就这一页问助手" small onClick={askAboutPage} />
              <IconButton icon="edit" label="编辑这一页" small onClick={() => showTab('page')} />
              {doc.jsonPath && currentEntry && <IconButton icon="open" label="在新标签页打开 HTML" small onClick={() => openHtml(currentEntry.htmlPath)} />}
              <IconButton icon="expand" label="演示 (P)" small onClick={() => setPresent(true)} />
            </div>
            {current && <SlideView slide={current} index={sel} total={slides.length} theme={doc.theme} />}
            <div className="pps-status">
              <b>
                {sel + 1} / {slides.length}
              </b>
              {current && <span>{LAYOUT_NAME[current.layout]}</span>}
              <span className="pps-wide">{dirty || !saved ? '草稿预览' : '与已生成文件一致'}</span>
            </div>
            <div className="pps-nav">
              <IconButton icon="chevL" label="上一页" small disabled={sel === 0} onClick={() => select(sel - 1)} />
              <IconButton icon="chevR" label="下一页" small disabled={sel >= slides.length - 1} onClick={() => select(sel + 1)} />
            </div>
          </div>
        </main>

        {/* filmstrip */}
        <section className={'pps-sheet pps-strip' + (layout.bottom ? ' open' : '')} aria-label="幻灯片">
          {!narrow && <Splitter grid={grid} layout={layout} sizeKey="stripHeight" onCommit={(v) => setLayout({ stripHeight: v })} label="调整幻灯片条高度" />}
          <div className="pps-ph">
            <Icon name="slides" size={14} />
            <span>幻灯片</span>
            <span className="ct">{slides.length} 页</span>
            <span className="pps-grow" />
            <IconButton icon={layout.bottom ? 'chevD' : 'chevU'} label={layout.bottom ? '折叠' : '展开'} small onClick={() => patchLayout({ bottom: !layout.bottom })} />
          </div>
          <div className={'pps-film' + (layout.bottom ? '' : ' pps-hidden')}>
            {slides.map((s, i) => (
              <button key={i} type="button" className="pps-thumb" aria-current={i === sel} style={{ width: stripThumbWidth }} onClick={() => select(i)}>
                <SlideView slide={s} index={i} total={slides.length} theme={doc.theme} />
                <span className="cap">
                  <b>{i + 1}</b>
                  <span>{s.title}</span>
                </span>
              </button>
            ))}
            <button
              type="button"
              className="pps-thumb add"
              style={{ width: stripThumbWidth }}
              onClick={() => {
                showTab('assistant')
                setDraft({ text: `在第 ${sel + 1} 页后面加一页：`, n: Date.now() })
              }}
            >
              <span className="pps-slide-box">
                <Icon name="plus" />
              </span>
              <span className="cap">
                <span>让助手加一页</span>
              </span>
            </button>
          </div>
        </section>

        {/* side panel: assistant, Markdown source, slide inspector */}
        <aside className={'pps-sheet pps-right' + (layout.right ? '' : ' pps-hidden')} aria-label="侧栏">
          <Splitter grid={grid} layout={layout} sizeKey="rightWidth" onCommit={(v) => setLayout({ rightWidth: v })} label="调整侧栏宽度" />
          <div className="pps-tabs" role="tablist">
            {SIDE_TAB_LABELS.map((t) => (
              <button key={t.id} type="button" role="tab" aria-selected={rightTab === t.id} onClick={() => showTab(t.id)}>
                <Icon name={t.icon} size={14} />
                {t.label}
                {t.id === 'source' && (dirty || !saved) && <span className="pps-dot" title="有改动未生成" />}
              </button>
            ))}
            <span className="pps-grow" />
            {session && rightTab === 'assistant' && (
              <span className={'pps-pill ' + (session.running ? 'warn' : 'ok')} title={session.displayTitle || sessionId}>
                <i />
                <span className="pps-wide">{session.running ? '运行中' : 'DSH 会话'}</span>
              </span>
            )}
            <IconButton icon="x" label="收起侧栏" small onClick={() => patchLayout({ right: false })} />
          </div>
          {/* the assistant stays mounted so the session keeps streaming while another tab is open */}
          <div style={{ display: rightTab === 'assistant' ? 'contents' : 'none' }}>
            <AssistantPane
              host={host}
              sessionId={sessionId}
              deck={deckContext}
              onDeckResult={onDeckResult}
              onOpenDeck={(p) => void openDeck(p, { force: true })}
              onOpenHtml={openHtml}
              focusRequest={focusRequest}
              draft={draft}
            />
          </div>
          {rightTab === 'source' && (
            <SourceEditor content={doc.content} slideCount={slides.length} dirty={dirty || !saved} busy={busy} onChange={(content) => setDoc({ ...doc, content })} onBuild={() => void build()} />
          )}
          {rightTab === 'page' && <Inspector slide={current} index={sel} onChange={editSlide} />}
        </aside>
      </div>

      {pop && (
        <div className={'pps-pop pps-pop-' + pop.kind} style={{ left: pop.x, top: pop.y, width: POP_WIDTH[pop.kind] }} role="dialog" aria-label={POP_LABEL[pop.kind]}>
          {pop.kind === 'decks' && (
            <DeckMenu
              dir={dir}
              decks={decks}
              loading={loadingDecks}
              current={doc.jsonPath}
              onOpen={(p) => {
                setPop(null)
                void openDeck(p)
              }}
              onNew={newDeck}
              onRefresh={() => void refreshDecks()}
              onOpenHtml={openHtml}
            />
          )}
          {pop.kind === 'themes' && slides[0] && <ThemeGallery cover={slides[0]} total={slides.length} theme={doc.theme} onPick={(id) => setDoc({ ...doc, theme: id })} />}
          {pop.kind === 'settings' && (
            <SettingsForm settings={settings} resolvedDir={info?.outputDir ?? dir} lang={doc.lang} theme={doc.theme} onSettings={setSettings} onLang={(lang) => setDoc({ ...doc, lang })} />
          )}
          {pop.kind === 'export' && currentEntry && (
            <>
              <div className="sub">{dirty ? '这是上次生成的文件，当前改动还没有写入' : '已生成的文件'}</div>
              {(['pptx', 'html', 'json'] as const).map((ext) => {
                const path = ext === 'pptx' ? currentEntry.pptxPath : ext === 'html' ? currentEntry.htmlPath : currentEntry.jsonPath
                return (
                  <button key={ext} type="button" className="row" onClick={() => (ext === 'html' ? openHtml(path) : copy(path))}>
                    <Icon name="file" size={14} />
                    <span className="grow">
                      .{ext}
                      <span className="path">{path}</span>
                    </span>
                    <span className="k">{ext === 'html' ? '打开' : '复制路径'}</span>
                  </button>
                )
              })}
            </>
          )}
          {pop.kind === 'help' &&
            (
              [
                ['← →', '上一页 / 下一页'],
                ['P', '演示'],
                [']', '开关侧栏'],
                ['\\', '开关幻灯片条'],
                ['Esc', '关闭弹层 / 退出演示'],
              ] as const
            ).map(([k, d]) => (
              <div key={k} className="row">
                {d}
                <span className="k">{k}</span>
              </div>
            ))}
        </div>
      )}

      {present && current && <Presenter slide={current} index={sel} total={slides.length} theme={doc.theme} onExit={() => setPresent(false)} />}
      {toast && (
        <div className="pps-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}

function IconButton(props: {
  icon: IconName
  label: string
  onClick(e: { currentTarget: HTMLElement }): void
  pressed?: boolean
  small?: boolean
  disabled?: boolean
  dataPop?: string
}) {
  return (
    <button
      type="button"
      className={'pps-ibtn' + (props.small ? ' sm' : '')}
      aria-label={props.label}
      title={props.label}
      aria-pressed={props.pressed}
      disabled={props.disabled}
      data-pop={props.dataPop}
      onClick={(e) => props.onClick(e)}
    >
      <Icon name={props.icon} size={props.small ? 14 : 16} />
    </button>
  )
}

/** Drag handle in the gap beside a sheet; resizes live through CSS variables, commits on release. */
function Splitter(props: { grid: { current: HTMLDivElement | null }; layout: Layout; sizeKey: 'rightWidth' | 'stripHeight'; label: string; onCommit(v: number): void }) {
  const { sizeKey } = props
  const vertical = sizeKey !== 'stripHeight'
  const apply = (v: number) => {
    const vars = gridVars({ ...props.layout, [sizeKey]: v })
    for (const [k, val] of Object.entries(vars)) props.grid.current?.style.setProperty(k, val)
  }
  return (
    <div
      className={'pps-split ' + (vertical ? 'v' : 'h')}
      role="separator"
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-label={props.label}
      aria-valuemin={LIMITS[sizeKey][0]}
      aria-valuemax={LIMITS[sizeKey][1]}
      aria-valuenow={props.layout[sizeKey]}
      tabIndex={0}
      onPointerDown={(e) => {
        e.preventDefault()
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)
        el.classList.add('drag')
        const start = props.layout[sizeKey]
        const x0 = e.clientX
        const y0 = e.clientY
        let value = start
        const move = (ev: PointerEvent) => {
          const d = sizeKey === 'rightWidth' ? x0 - ev.clientX : y0 - ev.clientY
          value = clampSize(sizeKey, start + d)
          apply(value)
        }
        const up = () => {
          el.classList.remove('drag')
          el.removeEventListener('pointermove', move)
          el.removeEventListener('pointerup', up)
          el.removeEventListener('pointercancel', up)
          props.onCommit(value)
        }
        el.addEventListener('pointermove', move)
        el.addEventListener('pointerup', up)
        el.addEventListener('pointercancel', up)
      }}
      onKeyDown={(e) => {
        const grow = sizeKey === 'rightWidth' ? 'ArrowLeft' : 'ArrowUp'
        const shrink = sizeKey === 'rightWidth' ? 'ArrowRight' : 'ArrowDown'
        if (e.key !== grow && e.key !== shrink) return
        e.preventDefault()
        e.stopPropagation()
        const step = (e.shiftKey ? 40 : 10) * (e.key === grow ? 1 : -1)
        props.onCommit(clampSize(sizeKey, props.layout[sizeKey] + step))
      }}
    />
  )
}

function Presenter(props: { slide: PptStudioSlide; index: number; total: number; theme: PptStudioThemeId; onExit(): void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current as (HTMLDivElement & { requestFullscreen?: () => Promise<void> }) | null
    el?.requestFullscreen?.().catch(() => {})
    const onChange = () => {
      if (!document.fullscreenElement) props.onExit()
    }
    // leaving browser fullscreen (Esc) also leaves the presentation
    const t = setTimeout(() => document.addEventListener('fullscreenchange', onChange), 300)
    return () => {
      clearTimeout(t)
      document.removeEventListener('fullscreenchange', onChange)
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    }
  }, [])
  return (
    <div className="pps-present" ref={ref} role="dialog" aria-label="演示" tabIndex={-1}>
      <SlideView slide={props.slide} index={props.index} total={props.total} theme={props.theme} />
      <div className="px">
        <span>
          {props.index + 1} / {props.total} · ← → 翻页
        </span>
        <button type="button" onClick={props.onExit}>
          退出 Esc
        </button>
      </div>
    </div>
  )
}

export { themeName }
