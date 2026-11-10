import { h, Fragment, useEffect, useMemo, useRef, useState } from './react.js'
import { Icon } from './icons.js'
import { SESSION_SOURCE, type Host, type SessionEntry, type SessionRef } from './host.js'
import type { PptStudioSlide } from '../types.js'

/** What the person is looking at, sent along with each request so the agent edits the right deck. */
export interface DeckContext {
  title: string
  content: string
  theme: string
  lang: string
  name?: string
  jsonPath?: string
  slides: PptStudioSlide[]
  sel: number
}

export interface DeckResultMeta {
  title?: string
  jsonPath?: string
  htmlPath?: string
  pptxPath?: string
  slideCount?: number
  theme?: string
}

type Item =
  | { kind: 'user'; key: string; text: string; ref?: string }
  | { kind: 'bot'; key: string; text: string }
  | { kind: 'tool'; key: string; name: string; title?: string; done: boolean; error: boolean; meta?: DeckResultMeta }
  | { kind: 'other'; key: string; name: string }

const MARK = '[PPT Studio]'
const ASK = '用户的要求：'
const REF = '当前选中：'

export function buildPrompt(ctx: DeckContext, request: string, withRef: boolean): string {
  const slide = ctx.slides[ctx.sel]
  const lines = [
    `${MARK} 用户正在 PPT Studio 中编辑一份演示文稿，请按要求修改并重新生成。`,
    `- 标题：${ctx.title}；主题：${ctx.theme}；语言：${ctx.lang}`,
    ctx.name
      ? `- 文件：${ctx.jsonPath}。修改后调用 ppt_studio_create，传入完整的 title 和 content，fileName 设为 "${ctx.name}"，overwrite 设为 true，覆盖这份 deck；PPT Studio 会自动载入结果。`
      : `- 这份 deck 还没有生成过。修改后调用 ppt_studio_create，传入完整的 title 和 content；PPT Studio 会自动载入结果。`,
    withRef && slide ? `- ${REF}第 ${ctx.sel + 1} 页「${slide.title}」` : '',
    '- 源稿规则：# 为章节页，## 为内容页，- 为要点，开头一段为封面副标题。',
    '',
    '当前 Markdown 源稿：',
    '```markdown',
    ctx.content,
    '```',
    '',
    ASK + request,
  ]
  return lines.filter((l, i) => l !== '' || lines[i - 1] !== '').join('\n')
}

/** Show a studio prompt in the pane as the person typed it, not with the context we wrapped around it. */
function unwrap(text: string): { text: string; ref?: string } {
  if (!text.startsWith(MARK)) return { text }
  const ask = text.lastIndexOf(ASK)
  const refLine = text.split('\n').find((l) => l.startsWith('- ' + REF))
  return { text: ask >= 0 ? text.slice(ask + ASK.length).trim() : text, ref: refLine?.slice(2 + REF.length) }
}

function textOf(content: any): string {
  if (!Array.isArray(content)) return ''
  return content
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('')
    .trim()
}

function deriveItems(entries: readonly SessionEntry[]): Item[] {
  const items: Item[] = []
  const tools = new Map<string, Extract<Item, { kind: 'tool' }>>()
  for (const entry of entries) {
    if (entry.type !== 'event') continue
    const { type, seq, data } = entry.event
    if (type === 'user/message' && data?.source?.kind === 'user') {
      const text = textOf(data.content)
      if (text) items.push({ kind: 'user', key: 'u' + seq, ...unwrap(text) })
    } else if (type === 'assistant/message') {
      const text = textOf(data?.message?.content)
      if (text) items.push({ kind: 'bot', key: 'a' + seq, text })
    } else if (type === 'tool/call') {
      if (String(data?.name).startsWith('ppt_studio')) {
        let title: string | undefined
        try {
          title = JSON.parse(data.arguments)?.title
        } catch {
          // partial or invalid arguments
        }
        const item = { kind: 'tool' as const, key: 't' + seq, name: data.name, title, done: false, error: false }
        tools.set(data.callId, item)
        items.push(item)
      } else {
        const last = items[items.length - 1]
        if (!(last?.kind === 'other' && last.name === data?.name)) items.push({ kind: 'other', key: 'o' + seq, name: String(data?.name ?? 'tool') })
      }
    } else if (type === 'tool/result') {
      const item = tools.get(data?.message?.toolCallId)
      if (item) {
        item.done = true
        item.error = Boolean(data?.message?.isError)
        item.meta = data?.meta ?? undefined
      }
    }
  }
  return items.slice(-80)
}

interface Feed {
  status: 'none' | 'loading' | 'ready' | 'error'
  running: boolean
  items: Item[]
  send(text: string): Promise<string | null>
}

/** Keep the current session retained while the pane is open, and read its conversation. */
function useSessionFeed(host: Host, sessionId: string | undefined, onDeckResult: (meta: DeckResultMeta) => void): Feed {
  const [status, setStatus] = useState<Feed['status']>('none')
  const [entries, setEntries] = useState<readonly SessionEntry[]>([])
  const [running, setRunning] = useState(false)
  const refHolder = useRef<SessionRef | null>(null)
  const onResult = useRef(onDeckResult)
  onResult.current = onDeckResult

  useEffect(() => {
    if (!sessionId || !host.sessions) {
      setStatus('none')
      setEntries([])
      return
    }
    let alive = true
    let baseline = Infinity // only results that arrive after opening load into the studio
    const seen = new Set<number>()
    const offs: Array<() => void> = []
    setStatus('loading')
    let ref: SessionRef
    try {
      ref = host.sessions.retain(sessionId, { source: SESSION_SOURCE })
    } catch {
      setStatus('error')
      return
    }
    refHolder.current = ref
    ref.ready.then(
      () => {
        if (!alive) return
        const { session, eventSource } = ref.binding
        const read = () => {
          const snap = eventSource.getSnapshot()
          setEntries(snap.entries)
          if (baseline === Infinity) {
            baseline = snap.entries.reduce((max, e) => Math.max(max, e.event.seq), -1)
          }
          for (const e of snap.entries) {
            if (e.type !== 'event' || e.event.type !== 'tool/result' || e.event.seq <= baseline || seen.has(e.event.seq)) continue
            seen.add(e.event.seq)
            const meta = e.event.data?.meta
            if (meta && typeof meta.jsonPath === 'string' && !e.event.data?.message?.isError) onResult.current(meta)
          }
        }
        const readRunning = () => setRunning(Boolean(session.getSnapshot().running))
        offs.push(eventSource.subscribe(read), session.subscribe(readRunning))
        read()
        readRunning()
        setStatus('ready')
      },
      () => alive && setStatus('error'),
    )
    return () => {
      alive = false
      for (const off of offs) off()
      refHolder.current = null
      ref.release()
    }
  }, [host, sessionId])

  const items = useMemo(() => deriveItems(entries), [entries])

  const send = async (text: string) => {
    const ref = refHolder.current
    if (!ref) return '没有可用的会话'
    try {
      await ref.ready
      const res = await ref.binding.session.prompt([{ type: 'text', text }], 'queue')
      return res?.ok === false ? res.error?.message || '发送失败' : null
    } catch (error) {
      return (error as Error)?.message || '发送失败'
    }
  }

  return { status, running, items, send }
}

const SUGGESTIONS = ['把这一页拆成两页', '把这一页的要点压缩到三条以内', '补一页总结并重新生成']

export function AssistantPane(props: {
  host: Host
  sessionId: string | undefined
  sessionTitle?: string
  deck: DeckContext
  onDeckResult(meta: DeckResultMeta): void
  onOpenDeck(path: string): void
  onOpenHtml(path: string): void
  focusRequest: number
  draft: { text: string; n: number } | null
}) {
  const feed = useSessionFeed(props.host, props.sessionId, props.onDeckResult)
  const [text, setText] = useState('')
  const [withRef, setWithRef] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)
  const chat = useRef<HTMLDivElement>(null)
  const slide = props.deck.slides[props.deck.sel]

  useEffect(() => {
    if (props.focusRequest) {
      setWithRef(true)
      input.current?.focus()
    }
  }, [props.focusRequest])
  useEffect(() => {
    if (props.draft) {
      setText(props.draft.text)
      setWithRef(true)
      input.current?.focus()
    }
  }, [props.draft?.n])
  useEffect(() => {
    const el = chat.current
    if (el) el.scrollTop = el.scrollHeight
  }, [feed.items.length, feed.running])

  const submit = async (value: string) => {
    const request = value.trim()
    if (!request || sending) return
    setSending(true)
    setError(null)
    const failure = await feed.send(buildPrompt(props.deck, request, withRef))
    setSending(false)
    if (failure) setError(failure)
    else setText('')
  }

  if (!props.host.sessions) {
    return <div className="pps-empty">这个 DSH 版本没有提供会话接口，助手不可用。</div>
  }
  if (!props.sessionId) {
    return (
      <div className="pps-empty">
        <Icon name="msg" size={20} />
        <div>还没有打开的会话。先回到对话开始一个会话，助手就会出现在这里。</div>
        <button type="button" className="pps-btn" onClick={() => props.host.layout?.selectPanel(null)}>
          回到对话
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="pps-chat" ref={chat} aria-live="polite">
        {feed.status === 'loading' && <div className="pps-working"><i />正在连接会话…</div>}
        {feed.status === 'error' && <div className="pps-empty">无法连接当前会话。</div>}
        {feed.status === 'ready' && feed.items.length === 0 && (
          <div className="pps-empty">
            <div>
              在这里告诉助手怎么改这份 deck。它会改写源稿，再调用 <code>ppt_studio_create</code> 重新生成，结果会自动载入。
            </div>
          </div>
        )}
        {feed.items.map((item) => {
          if (item.kind === 'user')
            return (
              <div key={item.key} className="pps-msg user">
                {item.ref && <span className="ref">{item.ref}</span>}
                {item.text}
              </div>
            )
          if (item.kind === 'bot') return <div key={item.key} className="pps-msg bot">{item.text}</div>
          if (item.kind === 'other') return <div key={item.key} className="pps-working">调用了 {item.name}</div>
          return (
            <div key={item.key} className="pps-toolcard">
              <div className="th">
                <Icon name="file" size={14} />
                {item.name}
                <span className={'pps-pill ' + (!item.done ? 'muted' : item.error ? 'warn' : 'ok')}>
                  <i />
                  {!item.done ? '生成中' : item.error ? '失败' : `${item.meta?.slideCount ?? '?'} 页`}
                </span>
              </div>
              {item.done && !item.error && item.meta?.jsonPath && (
                <div className="tb">
                  <span>{item.meta.title || item.title}</span>
                  <div className="acts">
                    <button type="button" className="pps-btn sm" onClick={() => props.onOpenDeck(item.meta!.jsonPath!)}>
                      载入
                    </button>
                    {item.meta.htmlPath && (
                      <button type="button" className="pps-btn sm" onClick={() => props.onOpenHtml(item.meta!.htmlPath!)}>
                        打开 HTML
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {feed.running && <div className="pps-working"><i />助手正在处理…</div>}
      </div>
      <div className="pps-suggest">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" disabled={sending} onClick={() => void submit(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className="pps-composer">
        {withRef && slide && (
          <div className="pps-refs">
            <span className="pps-ref">
              <span>
                第 {props.deck.sel + 1} 页 · {slide.title}
              </span>
              <button type="button" aria-label="不附带当前页" onClick={() => setWithRef(false)}>
                <Icon name="x" size={12} />
              </button>
            </span>
          </div>
        )}
        <textarea
          ref={input}
          rows={2}
          value={text}
          placeholder="说说这份 deck 要怎么改…"
          aria-label="给助手的消息"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void submit(text)
            }
          }}
        />
        <div className="pps-cfoot">
          <span className="q">{error ? <span style={{ color: 'var(--pps-error)' }}>{error}</span> : feed.running ? '会排在当前回合之后' : 'Enter 发送 · Shift+Enter 换行'}</span>
          <button type="button" className="pps-send" aria-label="发送" disabled={sending || !text.trim()} onClick={() => void submit(text)}>
            <Icon name="send" size={14} />
          </button>
        </div>
      </div>
    </>
  )
}
