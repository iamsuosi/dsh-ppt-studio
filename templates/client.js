/**
 * Client half of dsh-ppt-studio.
 *
 * Registers a sidebar entry and a main panel:
 * - sidebar.panellist adds the PPT Studio icon to the left sidebar.
 * - main renders the panel when that icon is selected.
 */
window.__ModuleLoader__.load({
  id: 'iamsuosi-dsh-ppt-studio',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState } = React

    const PANEL_ID = 'ppt-studio'
    const PANEL_ORDER = 50

    const THEMES = [
      { id: 'data', name: 'Data Drift', mood: 'Futuristic, immersive, cutting-edge', bestFor: 'AI / research / tech launches', colors: ['070B14', '0D1424', 'E8F1FF', '7E8BA8', '7C3AED', '06B6D4'] },
      { id: 'swiss', name: 'Swiss Pulse', mood: 'Precise, rational, data-driven', bestFor: 'SaaS / data / developer tools', colors: ['10151B', '161D26', 'F5F7FA', '8E9AAA', '2F6BFF', 'FFB300'] },
      { id: 'velvet', name: 'Velvet Standard', mood: 'Premium, restrained, trustworthy', bestFor: 'Executive / brand / investor', colors: ['111316', '1A1D22', 'F4EFE6', 'A79F91', 'C9A84C', '3D4A63'] },
      { id: 'soft', name: 'Soft Signal', mood: 'Warm, intimate, human', bestFor: 'Brand stories / training / personal talks', colors: ['FFF8EC', 'FFF2DE', '3B2F2A', '7E6F68', 'E58A2F', '8FAF8C'] },
      { id: 'bold', name: 'Maximalist Type', mood: 'Loud, kinetic, launch', bestFor: 'Product launches / events / brand moments', colors: ['0D0D0D', '181818', 'FFFFFF', 'B8B8B8', 'E63946', 'FFD60A'] },
    ]

    function SlidesGlyph(props) {
      const size = props && typeof props.size === 'number' && props.size > 0 ? props.size : 16
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.75,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        style: { display: 'block' }
      }, [
        h('rect', { key: 'r1', x: '3', y: '4', width: '18', height: '14', rx: '2' }),
        h('path', { key: 'p1', d: 'M8 21h8' }),
        h('path', { key: 'p2', d: 'M12 18v3' })
      ])
    }

    const STYLES = {
      panel: { height: '100%', width: '100%', boxSizing: 'border-box', padding: '20px', overflow: 'auto', background: 'var(--dsw-alias-bg-base)', color: 'var(--dsw-alias-label-primary)' },
      header: { marginBottom: '24px' },
      title: { fontSize: '22px', fontWeight: 600, margin: '0 0 6px' },
      subtitle: { fontSize: '13px', opacity: 0.7, margin: 0 },
      section: { marginBottom: '28px' },
      sectionTitle: { fontSize: '14px', fontWeight: 600, margin: '0 0 12px' },
      hint: { fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: '12px', background: 'var(--dsw-alias-bg-layer-2)', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px' },
      text: { fontSize: '13px', lineHeight: 1.6, opacity: 0.85, margin: '0 0 12px' },
      grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' },
      card: { border: '1px solid var(--dsw-alias-border-l1)', borderRadius: '12px', padding: '14px', background: 'var(--dsw-alias-bg-layer-1)' },
      preview: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' },
      swatch: { height: '28px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' },
      info: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' },
      name: { fontSize: '14px', fontWeight: 600 },
      mood: { fontSize: '12px', opacity: 0.7 },
      bestFor: { fontSize: '11px', opacity: 0.6 },
      button: { width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'var(--dsw-alias-brand-primary)', color: '#fff' },
      copied: { color: '#4ade80', fontSize: '12px', marginLeft: '8px' }
    }

    function ThemeCard({ theme }) {
      const [copied, setCopied] = useState(false)

      function copyExample() {
        const text = `ppt_studio_create {\n  title: "My Presentation",\n  content: "## Introduction\\n- Key point 1\\n- Key point 2\\n\\n## Details\\n- Supporting evidence",\n  theme: "${theme.id}",\n  lang: "en"\n}`
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }).catch(() => {})
      }

      return h('div', { style: STYLES.card },
        h('div', { style: STYLES.preview },
          theme.colors.map(c => h('span', { key: c, style: { ...STYLES.swatch, background: '#' + c } }))
        ),
        h('div', { style: STYLES.info },
          h('div', { style: STYLES.name }, theme.name),
          h('div', { style: STYLES.mood }, theme.mood),
          h('div', { style: STYLES.bestFor }, 'Best for: ' + theme.bestFor)
        ),
        h('button', { style: STYLES.button, onClick: copyExample },
          copied ? h(React.Fragment, null, 'Copied!', h('span', { style: STYLES.copied }, ' ✓')) : 'Copy example'
        )
      )
    }

    function PptStudioPanel() {
      return h('div', { style: STYLES.panel },
        h('div', { style: STYLES.header },
          h('h2', { style: STYLES.title }, 'PPT Studio'),
          h('p', { style: STYLES.subtitle }, 'Agent-first presentation studio for DeepSeek Harness.')
        ),
        h('div', { style: STYLES.section },
          h('h3', { style: STYLES.sectionTitle }, 'Quick Start'),
          h('p', { style: STYLES.text }, 'Ask the assistant to generate a deck, or copy a theme example and run it as a tool call in chat.'),
          h('div', { style: STYLES.hint }, 'ppt_studio_themes'),
          h('p', { style: STYLES.text }, 'Available tools: ppt_studio_create, ppt_studio_themes')
        ),
        h('div', { style: STYLES.section },
          h('h3', { style: STYLES.sectionTitle }, 'Themes'),
          h('div', { style: STYLES.grid },
            THEMES.map(theme => h(ThemeCard, { key: theme.id, theme }))
          )
        )
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('sidebar.panellist', function () {
          return ctx.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: PANEL_ORDER,
              label: 'PPT Studio'
            },
            function (owner) {
              const active = !!(owner && owner.active)
              const size = (owner && owner.size) || 16
              return h('span', {
                style: {
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: active ? 'var(--dsw-alias-brand-primary)' : 'inherit'
                }
              }, h(SlidesGlyph, { size: size }))
            }
          )
        })

        ctx.slots.inject('main', function () {
          return ctx.slots.register(
            { name: 'main', key: PANEL_ID },
            function () {
              return h(PptStudioPanel)
            }
          )
        })
      }
    }
  }
})
