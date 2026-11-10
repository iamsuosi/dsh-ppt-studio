import { useCallback, useSyncExternalStore } from './react.js'

/**
 * The studio is two columns: the stage (with the filmstrip under it) and a side panel.
 * What is open and how big it is stays in this browser, so the studio reopens as it was left.
 */
export const SIDE_TABS = ['assistant', 'source', 'page'] as const
export type SideTab = (typeof SIDE_TABS)[number]

export interface Layout {
  right: boolean
  bottom: boolean
  rightTab: SideTab
  rightWidth: number
  stripHeight: number
}

export const DEFAULT_LAYOUT: Layout = { right: true, bottom: true, rightTab: 'assistant', rightWidth: 380, stripHeight: 156 }
export const LIMITS = { rightWidth: [320, 560], stripHeight: [120, 260] } as const
type Sized = keyof typeof LIMITS

const KEY = 'dsh-ppt-studio:layout@2'
const listeners = new Set<() => void>()
const clamp = (n: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, n))

export function parseLayout(text: string | null): Layout {
  if (!text) return DEFAULT_LAYOUT
  try {
    const raw = JSON.parse(text) as Record<string, unknown>
    const flag = (k: 'right' | 'bottom') => (typeof raw[k] === 'boolean' ? (raw[k] as boolean) : DEFAULT_LAYOUT[k])
    const size = (k: Sized) => (typeof raw[k] === 'number' && Number.isFinite(raw[k]) ? clamp(raw[k] as number, LIMITS[k]) : DEFAULT_LAYOUT[k])
    return {
      right: flag('right'),
      bottom: flag('bottom'),
      rightTab: SIDE_TABS.find((t) => t === raw.rightTab) ?? DEFAULT_LAYOUT.rightTab,
      rightWidth: size('rightWidth'),
      stripHeight: size('stripHeight'),
    }
  } catch {
    return DEFAULT_LAYOUT
  }
}

let cache: { text: string | null; layout: Layout } | undefined
let memory: Layout | undefined // when storage refuses writes, this page's arrangement is the truth

function snapshot(): Layout {
  if (memory) return memory
  let text: string | null = null
  try {
    text = window.localStorage.getItem(KEY)
  } catch {
    // no storage: defaults
  }
  if (cache?.text !== text) cache = { text, layout: parseLayout(text) }
  return cache.layout
}

export function clampSize(key: Sized, value: number): number {
  return clamp(Math.round(value), LIMITS[key])
}

export function useLayout(): [Layout, (patch: Partial<Layout>) => void] {
  const layout = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    snapshot,
    () => DEFAULT_LAYOUT,
  )
  const set = useCallback((patch: Partial<Layout>) => {
    const next = { ...snapshot(), ...patch }
    const text = JSON.stringify(next)
    try {
      window.localStorage.setItem(KEY, text)
      memory = undefined
    } catch {
      memory = next
    }
    cache = { text, layout: next }
    for (const listener of listeners) listener()
  }, [])
  return [layout, set]
}
