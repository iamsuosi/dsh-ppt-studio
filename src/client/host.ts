/**
 * The slice of DSH client services the studio uses. Typed loosely on purpose: these come from
 * other packages' client bundles at runtime (see package.json `dsh.client.inject`).
 */
export interface SessionRef {
  ready: Promise<unknown>
  binding: {
    session: {
      getSnapshot(): { running?: boolean } & Record<string, unknown>
      subscribe(listener: () => void): () => void
      prompt(parts: Array<{ type: 'text'; text: string }>, mode: 'queue' | 'steer'): Promise<{ ok: boolean; error?: { message?: string } }>
    }
    eventSource: {
      getSnapshot(): { entries: readonly SessionEntry[]; revision: number }
      subscribe(listener: () => void): () => void
    }
  }
  release(): void
}

export type SessionEntry =
  | { type: 'event'; event: { type: string; seq: number; time: number; data: any } }
  | { type: 'transient'; event: { type: string; seq: number; time: number; data: any } }

export interface SessionSummary {
  id: string
  cwd?: string
  displayTitle?: string
  running?: boolean
  retainedBy?: Record<string, number>
}

export interface SessionList {
  byId: Record<string, SessionSummary>
}

export interface Host {
  sessions?: {
    retain(id: string, options: { source: string }): SessionRef
    list?: { getSnapshot(): SessionList; subscribe(listener: () => void): () => void }
  }
  layout?: { selectPanel(id: string | null): void }
}

/** The session the main chat view holds: the one the person is working in. */
export function currentSessionId(list: SessionList | undefined): string | undefined {
  if (!list) return undefined
  return Object.values(list.byId).find((s) => (s.retainedBy?.mainView ?? 0) > 0)?.id
}

export const PANEL_ID = 'ppt-studio'
export const SESSION_SOURCE = 'pptStudio'
