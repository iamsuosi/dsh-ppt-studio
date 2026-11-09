// DSH Web client entry for dsh-ppt-studio.
// Distributed directly to the browser; tsc does not rewrite this file.
window.__ModuleLoader__.load({ id: 'iamsuosi-dsh-ppt-studio', factory: require => {
  const React = require('react');
  const W = createWorkbenchUI(React);
  const h = React.createElement;
  const { useState, useEffect } = React;

  const THEMES = [
    { id: 'data', name: 'Data Drift', mood: 'Futuristic, immersive, cutting-edge', bestFor: 'AI / research / tech launches', colors: ['070B14', '0D1424', 'E8F1FF', '7E8BA8', '7C3AED', '06B6D4'] },
    { id: 'swiss', name: 'Swiss Pulse', mood: 'Precise, rational, data-driven', bestFor: 'SaaS / data / developer tools', colors: ['10151B', '161D26', 'F5F7FA', '8E9AAA', '2F6BFF', 'FFB300'] },
    { id: 'velvet', name: 'Velvet Standard', mood: 'Premium, restrained, trustworthy', bestFor: 'Executive / brand / investor', colors: ['111316', '1A1D22', 'F4EFE6', 'A79F91', 'C9A84C', '3D4A63'] },
    { id: 'soft', name: 'Soft Signal', mood: 'Warm, intimate, human', bestFor: 'Brand stories / training / personal talks', colors: ['FFF8EC', 'FFF2DE', '3B2F2A', '7E6F68', 'E58A2F', '8FAF8C'] },
    { id: 'bold', name: 'Maximalist Type', mood: 'Loud, kinetic, launch', bestFor: 'Product launches / events / brand moments', colors: ['0D0D0D', '181818', 'FFFFFF', 'B8B8B8', 'E63946', 'FFD60A'] },
  ];

  const PANEL_CSS = `
    .ppt-studio-panel { padding: 8px 0; }
    .ppt-studio-section { margin-bottom: 24px; }
    .ppt-studio-section h3 { margin: 0 0 10px; font-size: 16px; }
    .ppt-studio-muted { color: var(--w-muted, #667085); font-size: 13px; margin: 0 0 12px; line-height: 1.6; }
    .ppt-studio-hint { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; background: var(--w-soft, #f7f8fa); padding: 10px 12px; border-radius: 8px; border: 1px solid var(--w-border, #e7e9ef); margin-bottom: 16px; }
    .ppt-studio-themes { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .ppt-studio-theme-card { border: 1px solid var(--w-border, #e7e9ef); border-radius: 12px; padding: 14px; background: var(--w-bg, #fff); }
    .ppt-studio-theme-preview { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }
    .ppt-studio-theme-preview span { height: 28px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.08); }
    .ppt-studio-theme-info { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .ppt-studio-theme-info strong { font-size: 14px; }
    .ppt-studio-theme-info span { font-size: 12px; color: var(--w-muted, #667085); }
    .ppt-studio-theme-info small { font-size: 11px; color: var(--w-muted, #667085); }
    .ppt-studio-copied { color: var(--dsw-alias-state-success-primary, #24794a); font-size: 12px; margin-left: 8px; }
  `;

  function ThemeCard({ theme }) {
    const [copied, setCopied] = useState(false);

    function copyExample() {
      const text = `ppt_studio_create {\n  title: "My Presentation",\n  content: "## Introduction\\n- Key point 1\\n- Key point 2\\n\\n## Details\\n- Supporting evidence",\n  theme: "${theme.id}",\n  lang: "en"\n}`;
      navigator.clipboard?.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }

    return h('div', { className: 'ppt-studio-theme-card' },
      h('div', { className: 'ppt-studio-theme-preview' },
        theme.colors.map(c => h('span', { key: c, style: { background: '#' + c } }))
      ),
      h('div', { className: 'ppt-studio-theme-info' },
        h('strong', null, theme.name),
        h('span', null, theme.mood),
        h('small', null, 'Best for: ' + theme.bestFor)
      ),
      h(W.Button, { onClick: copyExample },
        copied ? h(React.Fragment, null, 'Copied!', h('span', { className: 'ppt-studio-copied' }, '✓')) : 'Copy example'
      )
    );
  }

  function PptStudioPanel() {
    return h(W.Page, {
      title: 'PPT Studio',
      subtitle: 'Agent-first presentation studio for DeepSeek Harness.'
    },
      h('style', null, PANEL_CSS),
      h('div', { className: 'ppt-studio-panel' },
        h('section', { className: 'ppt-studio-section' },
          h('h3', null, 'Quick Start'),
          h('p', { className: 'ppt-studio-muted' }, 'Ask the assistant to generate a deck, or copy a theme example and run it as a tool call in chat.'),
          h('div', { className: 'ppt-studio-hint' }, 'ppt_studio_themes'),
          h('div', { className: 'ppt-studio-muted' }, 'Available tools: ppt_studio_create, ppt_studio_themes')
        ),
        h('section', { className: 'ppt-studio-section' },
          h('h3', null, 'Themes'),
          h('div', { className: 'ppt-studio-themes' },
            THEMES.map(theme => h(ThemeCard, { key: theme.id, theme }))
          )
        )
      )
    );
  }

  // Return the panel component. DSH mounts it into the sidebar/main slot based on dsh.client.inject.
  return PptStudioPanel;
}});
