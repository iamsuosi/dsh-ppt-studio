// DSH Web client entry for dsh-ppt-studio.
// Distributed directly to the browser; tsc does not rewrite this file.
window.__ModuleLoader__.load({ id: 'iamsuosi-dsh-ppt-studio', factory: require => {
  const React = require('react');
  const h = React.createElement;
  const { useState } = React;

  const THEMES = [
    { id: 'data', name: 'Data Drift', mood: 'Futuristic, immersive, cutting-edge', bestFor: 'AI / research / tech launches', colors: ['070B14', '0D1424', 'E8F1FF', '7E8BA8', '7C3AED', '06B6D4'] },
    { id: 'swiss', name: 'Swiss Pulse', mood: 'Precise, rational, data-driven', bestFor: 'SaaS / data / developer tools', colors: ['10151B', '161D26', 'F5F7FA', '8E9AAA', '2F6BFF', 'FFB300'] },
    { id: 'velvet', name: 'Velvet Standard', mood: 'Premium, restrained, trustworthy', bestFor: 'Executive / brand / investor', colors: ['111316', '1A1D22', 'F4EFE6', 'A79F91', 'C9A84C', '3D4A63'] },
    { id: 'soft', name: 'Soft Signal', mood: 'Warm, intimate, human', bestFor: 'Brand stories / training / personal talks', colors: ['FFF8EC', 'FFF2DE', '3B2F2A', '7E6F68', 'E58A2F', '8FAF8C'] },
    { id: 'bold', name: 'Maximalist Type', mood: 'Loud, kinetic, launch', bestFor: 'Product launches / events / brand moments', colors: ['0D0D0D', '181818', 'FFFFFF', 'B8B8B8', 'E63946', 'FFD60A'] },
  ];

  const STYLES = {
    panel: { padding: '16px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif', color: 'var(--dsh-fg, #e8eaed)' },
    header: { marginBottom: '20px' },
    title: { fontSize: '20px', fontWeight: 600, margin: '0 0 6px' },
    subtitle: { fontSize: '13px', opacity: 0.7, margin: 0 },
    section: { marginBottom: '24px' },
    sectionTitle: { fontSize: '14px', fontWeight: 600, margin: '0 0 10px' },
    hint: { fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace', fontSize: '12px', background: 'var(--dsh-soft, #2c2c2c)', padding: '10px 12px', borderRadius: '8px', marginBottom: '12px' },
    text: { fontSize: '13px', lineHeight: 1.6, opacity: 0.85, margin: '0 0 12px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' },
    card: { border: '1px solid var(--dsh-border, #3c3c3c)', borderRadius: '12px', padding: '14px', background: 'var(--dsh-bg, #1e1e1e)' },
    preview: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' },
    swatch: { height: '28px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' },
    info: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' },
    name: { fontSize: '14px', fontWeight: 600 },
    mood: { fontSize: '12px', opacity: 0.7 },
    bestFor: { fontSize: '11px', opacity: 0.6 },
    button: { width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: 'var(--dsh-accent, #2f6bff)', color: '#fff' },
    copied: { color: '#4ade80', fontSize: '12px', marginLeft: '8px' }
  };

  function ThemeCard({ theme }) {
    const [copied, setCopied] = useState(false);

    function copyExample() {
      const text = `ppt_studio_create {\n  title: "My Presentation",\n  content: "## Introduction\\n- Key point 1\\n- Key point 2\\n\\n## Details\\n- Supporting evidence",\n  theme: "${theme.id}",\n  lang: "en"\n}`;
      navigator.clipboard?.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
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
    );
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
    );
  }

  return PptStudioPanel;
}});
