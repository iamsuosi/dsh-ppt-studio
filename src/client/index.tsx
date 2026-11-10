/**
 * Browser half of dsh-ppt-studio. Registers:
 *  - a sidebar entry and the `main` panel holding the studio workbench;
 *  - a chat card for `ppt_studio_create` results with "open in PPT Studio".
 */
import { bindReact, h } from './react.js'
import { ensureStyles } from './styles.js'
import { Studio } from './studio.js'
import { Icon } from './icons.js'
import { api } from './api.js'
import { requestOpenDeck } from './bus.js'
import { PANEL_ID, type Host } from './host.js'

declare const window: Window & { __ModuleLoader__: { load(module: { id: string; factory(require: (id: string) => any): unknown }): void } }

interface Slots {
  inject(name: string, factory: () => unknown): void
  register(owner: Record<string, unknown>, render: (props: any) => unknown): unknown
}

interface ClientContext extends Host {
  slots: Slots
}

function ToolCard(props: { host: Host; phase: string; block?: { isError?: boolean; meta?: any; error?: { reason?: string } } }) {
  if (props.phase !== 'result') {
    return (
      <div className="pps-chatcard">
        <div className="ic">
          <Icon name="slides" />
        </div>
        <div className="tx">
          <b>正在生成演示文稿…</b>
        </div>
      </div>
    )
  }
  const meta = props.block?.meta
  if (props.block?.isError || !meta?.jsonPath) {
    return (
      <div className="pps-chatcard err">
        <div className="ic">
          <Icon name="slides" />
        </div>
        <div className="tx">
          <b>演示文稿生成失败</b>
          {props.block?.error?.reason && <span>{props.block.error.reason}</span>}
        </div>
      </div>
    )
  }
  return (
    <div className="pps-chatcard">
      <div className="ic">
        <Icon name="slides" />
      </div>
      <div className="tx">
        <b>{meta.title || '演示文稿'}</b>
        <span>
          {meta.slideCount} 页 · {meta.theme} · {String(meta.jsonPath).split(/[\\/]/).pop()?.replace(/\.json$/, '')}
        </span>
      </div>
      <div className="acts">
        {meta.htmlPath && (
          <button type="button" onClick={() => window.open(api.htmlUrl(meta.htmlPath), '_blank', 'noopener')}>
            预览
          </button>
        )}
        <button
          type="button"
          className="primary"
          onClick={() => {
            requestOpenDeck(meta.jsonPath)
            props.host.layout?.selectPanel(PANEL_ID)
          }}
        >
          在 PPT Studio 中打开
        </button>
      </div>
    </div>
  )
}

window.__ModuleLoader__.load({
  id: '@iamsuosi/dsh-ppt-studio',
  factory(require) {
    bindReact(require('react'))
    return {
      inject: ['slots', 'sessions', 'layout'],
      apply(ctx: ClientContext) {
        ensureStyles()
        const host: Host = {
          get sessions() {
            return ctx.sessions
          },
          get layout() {
            return ctx.layout
          },
        }

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 50, label: 'PPT Studio' }, (owner: { active?: boolean; size?: number }) => (
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: owner?.active ? 'var(--dsw-alias-state-business-primary)' : 'inherit' }}>
              <Icon name="slides" size={owner?.size || 16} />
            </span>
          )),
        )

        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, () => <Studio host={host} />))

        ctx.slots.inject('tool.call.toolview', () =>
          ctx.slots.register({ name: 'tool.call.toolview', key: 'ppt_studio_create' }, (props: any) => <ToolCard host={host} phase={props.phase} block={props.block} />),
        )
      },
    }
  },
})
