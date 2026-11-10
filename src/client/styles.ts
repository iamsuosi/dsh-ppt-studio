/**
 * Studio stylesheet, injected once. Colours come from DSH's --dsw-alias-* tokens so the studio follows
 * the host theme; light mode needs a grey ground of its own because every host layer is white there.
 * Layout reacts to the panel's own width (container queries), not the window.
 */
const CSS = String.raw`
.pps {
  --pps-ground: var(--dsw-static-neutral-bluish-50, #f4f6f9);
  --pps-card: var(--dsw-alias-bg-layer-1, #fff);
  --pps-soft: var(--dsw-alias-interactive-bg-hover, rgba(38,49,72,.06));
  --pps-float: var(--dsw-alias-bg-layer-1, #fff);
  --pps-fg: var(--dsw-alias-label-primary, #1b2330);
  --pps-muted: var(--dsw-alias-label-secondary, #5b6678);
  --pps-faint: var(--dsw-alias-label-tertiary, #8a94a5);
  --pps-border: var(--dsw-alias-border-l2, rgba(0,0,0,.1));
  --pps-hover: var(--dsw-alias-interactive-bg-hover, rgba(38,49,72,.06));
  --pps-accent: var(--dsw-alias-state-business-primary, #4d6bfe);
  --pps-accent-soft: color-mix(in srgb, var(--pps-accent) 13%, transparent);
  --pps-ok: var(--dsw-alias-state-success-primary, #1f9d55);
  --pps-warn: var(--dsw-alias-state-warn-primary, #d48806);
  --pps-error: var(--dsw-alias-state-error-primary, #d93026);
  --pps-primary: var(--dsw-alias-button-primary-fill, #1b2330);
  --pps-on-primary: var(--dsw-alias-label-primary-inverted, #fff);
  --pps-shadow: 0 1px 2px rgba(20,30,45,.06), 0 8px 24px rgba(20,30,45,.10);
  --pps-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --pps-r: 10px;
  position: relative; height: 100%; width: 100%; min-width: 0; overflow: hidden;
  container-type: inline-size; container-name: pps;
  background: var(--pps-ground); color: var(--pps-fg);
  font-size: 13px; line-height: 1.5;
}
body[data-ds-dark-theme] .pps {
  --pps-ground: var(--dsw-alias-bg-base, #10151c);
  --pps-shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.4);
}
.pps *, .pps *::before, .pps *::after { box-sizing: border-box; }
.pps button, .pps input, .pps textarea, .pps select { font: inherit; color: inherit; }
.pps button { cursor: pointer; }
.pps button:disabled { cursor: default; opacity: .55; }
.pps :focus-visible { outline: 2px solid var(--pps-accent); outline-offset: 1px; }

.pps-grid {
  height: 100%; display: grid;
  grid-template-areas: "header header" "stage right" "strip right";
  grid-template-columns: var(--pps-cols); grid-template-rows: var(--pps-rows);
}
.pps-sheet { position: relative; min-height: 0; min-width: 0; margin: 0 8px 8px 0; border: 1px solid var(--pps-border); border-radius: var(--pps-r); background: var(--pps-card); display: flex; flex-direction: column; }
.pps-stage { grid-area: stage; overflow: hidden; margin-left: 8px; }
.pps-strip { grid-area: strip; margin-left: 8px; }
.pps-right { grid-area: right; }
.pps-hidden { display: none !important; }

/* header */
.pps-hdr { grid-area: header; display: flex; align-items: center; gap: 6px; padding: 0 8px 0 10px; min-width: 0; }
.pps-brand { display: flex; align-items: center; gap: 8px; font-weight: 600; flex: none; }
.pps-logo { width: 24px; height: 24px; border-radius: 7px; background: var(--pps-primary); color: var(--pps-on-primary); display: grid; place-items: center; }
.pps-crumb { color: var(--pps-faint); flex: none; }
.pps-title { min-width: 60px; flex: 0 1 300px; height: 30px; border: 1px solid transparent; border-radius: 7px; background: transparent; padding: 0 8px; font-weight: 600; text-overflow: ellipsis; }
.pps-title:hover { background: var(--pps-hover); }
.pps-title:focus { background: var(--pps-card); border-color: var(--pps-border); outline: none; box-shadow: 0 0 0 2px var(--pps-accent-soft); }
.pps-pill { display: inline-flex; align-items: center; gap: 6px; height: 22px; padding: 0 9px; border-radius: 999px; font-size: 11.5px; white-space: nowrap; flex: none; }
.pps-pill i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.pps-pill.ok { color: var(--pps-ok); background: color-mix(in srgb, var(--pps-ok) 12%, transparent); }
.pps-pill.warn { color: var(--pps-warn); background: color-mix(in srgb, var(--pps-warn) 14%, transparent); }
.pps-pill.muted { color: var(--pps-muted); background: var(--pps-soft); }
.pps-hdr-right { margin-left: auto; display: flex; align-items: center; gap: 4px; flex: none; }
.pps-ibtn { width: 30px; height: 30px; border-radius: 8px; border: 0; background: transparent; display: grid; place-items: center; color: var(--pps-muted); flex: none; }
.pps-ibtn:hover:not(:disabled) { background: var(--pps-hover); color: var(--pps-fg); }
.pps-ibtn[aria-pressed="true"] { color: var(--pps-accent); }
.pps-ibtn.sm { width: 26px; height: 26px; border-radius: 6px; }
.pps-btn { height: 30px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--pps-border); background: var(--pps-card); display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; flex: none; }
.pps-btn:hover:not(:disabled) { background: var(--pps-hover); }
.pps-btn.primary { background: var(--pps-primary); color: var(--pps-on-primary); border-color: transparent; }
.pps-btn.primary:hover:not(:disabled) { background: var(--pps-primary); opacity: .88; }
.pps-btn.accent { background: var(--pps-accent); color: #fff; border-color: transparent; }
.pps-btn.ghost { border-color: transparent; background: transparent; color: var(--pps-muted); padding: 0 8px; gap: 5px; }
.pps-btn.ghost:hover, .pps-btn.ghost[aria-expanded="true"] { background: var(--pps-hover); color: var(--pps-fg); }
.pps-btn.sm { height: 26px; padding: 0 9px; font-size: 12px; }
.pps-vsep { width: 1px; height: 18px; background: var(--pps-border); margin: 0 4px; flex: none; }
.pps-chip { display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 10px 0 6px; border-radius: 8px; border: 1px solid var(--pps-border); background: var(--pps-card); font-size: 12.5px; flex: none; }
.pps-chip:hover { background: var(--pps-hover); }
.pps-sw { display: inline-flex; border-radius: 5px; overflow: hidden; box-shadow: 0 0 0 1px var(--pps-border); }
.pps-sw i { width: 8px; height: 16px; display: block; }

/* popover */
.pps-pop { position: absolute; z-index: 40; max-width: calc(100% - 16px); max-height: calc(100% - 64px); overflow: auto; display: flex; flex-direction: column; background: var(--pps-float); border: 1px solid var(--pps-border); border-radius: 10px; box-shadow: var(--pps-shadow); padding: 6px; }
.pps-pop .row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 7px 8px; border: 0; background: transparent; border-radius: 7px; text-align: left; min-width: 0; }
.pps-pop button.row:hover { background: var(--pps-hover); }
.pps-pop .k { margin-left: auto; font: 10.5px var(--pps-mono); color: var(--pps-muted); border: 1px solid var(--pps-border); border-radius: 4px; padding: 0 4px; flex: none; }
.pps-pop .sub { font-size: 11px; color: var(--pps-muted); padding: 6px 8px 4px; }
.pps-pop .path { display: block; font: 11px var(--pps-mono); color: var(--pps-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pps-pop .grow { min-width: 0; flex: 1; }

.pps-grow { flex: 1; min-width: 0; }
.pps-scroll { flex: 1; min-height: 0; overflow: auto; }
.pps-empty { padding: 24px 16px; color: var(--pps-muted); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }

/* source */
.pps-legend { padding: 8px 12px; border-bottom: 1px solid var(--pps-border); font-size: 11.5px; color: var(--pps-muted); display: flex; flex-wrap: wrap; gap: 4px 12px; }
.pps-legend code { font-family: var(--pps-mono); color: var(--pps-fg); }
.pps-src { flex: 1; min-height: 0; width: 100%; resize: none; border: 0; padding: 12px 14px; background: transparent; font: 12.5px/1.75 var(--pps-mono); outline: none; tab-size: 2; }
.pps .pps-src:focus-visible { outline: none; }
.pps-foot { flex: none; display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-top: 1px solid var(--pps-border); font-size: 11.5px; color: var(--pps-muted); }
.pps-foot .pps-btn { margin-left: auto; }

/* themes */
.pps-tgrid { padding: 4px; display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 8px; }
.pps-tcard { display: flex; flex-direction: column; gap: 8px; padding: 8px; border: 1px solid var(--pps-border); border-radius: 9px; background: var(--pps-card); text-align: left; }
.pps-tcard:hover { border-color: var(--pps-faint); }
.pps-tcard[aria-pressed="true"] { border-color: var(--pps-accent); box-shadow: 0 0 0 2px var(--pps-accent-soft); }
.pps-tcard .nm { font-weight: 600; display: flex; align-items: center; gap: 6px; }
.pps-tcard .md, .pps-tcard .bf { font-size: 11.5px; color: var(--pps-muted); }
.pps-tag { font-size: 10px; font-weight: 500; color: var(--pps-accent); background: var(--pps-accent-soft); border-radius: 4px; padding: 0 5px; }

/* deck menu (popover) */
.pps-dir { padding: 4px 4px 8px 8px; margin-bottom: 4px; border-bottom: 1px solid var(--pps-border); font: 11px var(--pps-mono); color: var(--pps-muted); display: flex; align-items: center; gap: 6px; }
.pps-dir span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: rtl; text-align: left; }
.pps-decklist { display: flex; flex-direction: column; gap: 2px; min-height: 0; overflow: auto; }
.pps-deckrow { display: flex; align-items: center; gap: 4px; border-radius: 8px; padding-right: 4px; }
.pps-deckrow:hover { background: var(--pps-hover); }
.pps-deckrow.cur { background: var(--pps-accent-soft); }
.pps-deckrow .main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; padding: 7px 8px; border: 0; background: transparent; text-align: left; }
.pps-deckrow .sw { display: inline-flex; width: 22px; height: 22px; border-radius: 6px; overflow: hidden; flex: none; box-shadow: 0 0 0 1px var(--pps-border); }
.pps-deckrow .sw i { flex: 1; }
.pps-deckrow .tx { min-width: 0; flex: 1; display: flex; flex-direction: column; }
.pps-deckrow .tx b { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pps-deckrow .tx span { font-size: 11.5px; color: var(--pps-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pps-pop-decks > .row { margin-top: 4px; border-top: 1px solid var(--pps-border); border-radius: 0 0 7px 7px; color: var(--pps-accent); }

/* forms */
.pps-form { padding: 12px; display: flex; flex-direction: column; gap: 14px; }
.pps-field label, .pps-field .lbl { display: block; font-size: 12px; font-weight: 600; margin-bottom: 5px; }
.pps-field .hint { font-size: 11px; color: var(--pps-muted); margin-top: 4px; }
.pps-in { width: 100%; height: 32px; border: 1px solid var(--pps-border); border-radius: 7px; background: var(--pps-card); padding: 0 9px; }
.pps-in.mono { font: 12px var(--pps-mono); }
textarea.pps-in { height: auto; padding: 8px 9px; resize: vertical; }
.pps-seg { display: inline-flex; border: 1px solid var(--pps-border); border-radius: 8px; padding: 2px; gap: 2px; }
.pps-seg button { border: 0; background: transparent; border-radius: 6px; padding: 4px 12px; color: var(--pps-muted); }
.pps-seg button[aria-pressed="true"] { background: var(--pps-hover); color: var(--pps-fg); font-weight: 600; }
.pps-pre { margin: 0; background: var(--pps-soft); border-radius: 8px; padding: 10px; font: 11.5px/1.6 var(--pps-mono); color: var(--pps-muted); overflow-x: auto; white-space: pre; }

/* stage */
.pps-banner { flex: none; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px 10px; padding: 6px 12px; background: var(--pps-accent-soft); color: var(--pps-accent); font-size: 12.5px; border-bottom: 1px solid var(--pps-border); border-radius: var(--pps-r) var(--pps-r) 0 0; }
.pps-banner.err { background: color-mix(in srgb, var(--pps-error) 12%, transparent); color: var(--pps-error); }
.pps-canvas { position: relative; flex: 1; min-height: 0; display: grid; place-items: center; padding: 22px 22px 36px; container-type: size; }
.pps-canvas > .pps-slide-box { width: min(100cqw, calc(100cqh * 16 / 9)); box-shadow: 0 2px 6px rgba(0,0,0,.12), 0 18px 48px rgba(0,0,0,.16); }
.pps-tools { position: absolute; top: 10px; right: 10px; z-index: 5; display: flex; gap: 2px; padding: 2px; background: var(--pps-float); border: 1px solid var(--pps-border); border-radius: 8px; }
.pps-status { position: absolute; left: 12px; bottom: 8px; display: flex; gap: 10px; align-items: center; font-size: 11.5px; color: var(--pps-muted); }
.pps-status b { font: 500 11.5px var(--pps-mono); color: var(--pps-fg); }
.pps-nav { position: absolute; right: 10px; bottom: 6px; display: flex; gap: 2px; }

/* slide renderer: mirrors src/engine.ts renderHtmlSlide, vh -> cqh */
.pps-slide-box { position: relative; aspect-ratio: 16 / 9; max-width: 100%; container-type: size; overflow: hidden; border-radius: 3px; }
.pps-slide { position: absolute; inset: 0; padding: 6cqh 8cqw; display: flex; flex-direction: column; justify-content: center; background: var(--s-bg); color: var(--s-fg); font-family: var(--s-bf); line-height: 1.25; text-align: left; }
.pps-slide h1, .pps-slide h2 { margin: 0 0 3cqh; font-family: var(--s-hf); font-weight: 700; line-height: 1.15; }
.pps-slide h1 { font-size: 6cqh; }
.pps-slide h2 { font-size: 5cqh; color: var(--s-accent); }
.pps-s-st { font-size: 2.8cqh; color: var(--s-muted); margin-bottom: 2cqh; }
.pps-slide ul { list-style: none; margin: 0; padding: 0; }
.pps-slide li { font-size: 3cqh; margin: 2cqh 0; padding-left: 2cqw; position: relative; }
.pps-slide li::before { content: "•"; color: var(--s-accent); position: absolute; left: 0; }
.pps-s-stmt { font-size: 5cqh; font-weight: 700; }
.pps-s-num { position: absolute; bottom: 3cqh; right: 3cqw; font-size: 1.6cqh; color: var(--s-muted); }

/* filmstrip */
.pps-strip .pps-ph { border-bottom: 0; }
.pps-strip.open .pps-ph { border-bottom: 1px solid var(--pps-border); }
.pps-ph { display: flex; align-items: center; gap: 8px; height: 40px; flex: none; padding: 0 8px 0 12px; font-size: 12.5px; font-weight: 600; }
.pps-ph .ct { color: var(--pps-muted); font: 400 11px var(--pps-mono); }
.pps-film { flex: 1; min-height: 0; display: flex; gap: 10px; overflow-x: auto; overflow-y: hidden; padding: 10px 12px; align-items: flex-start; }
.pps-thumb { flex: none; display: flex; flex-direction: column; gap: 5px; border: 0; background: transparent; padding: 0; text-align: left; }
.pps-thumb .pps-slide-box { border-radius: 5px; box-shadow: 0 0 0 1px var(--pps-border); }
.pps-thumb[aria-current="true"] .pps-slide-box { box-shadow: 0 0 0 2px var(--pps-accent); }
.pps-thumb .cap { display: flex; gap: 6px; font-size: 11px; color: var(--pps-muted); max-width: 100%; }
.pps-thumb .cap b { font: 500 11px var(--pps-mono); color: var(--pps-fg); }
.pps-thumb .cap span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pps-thumb.add .pps-slide-box { display: grid; place-items: center; background: var(--pps-soft); color: var(--pps-muted); box-shadow: inset 0 0 0 1px var(--pps-border); }

/* right */
.pps-tabs { display: flex; align-items: center; gap: 2px; height: 40px; padding: 0 6px 0 8px; border-bottom: 1px solid var(--pps-border); flex: none; }
.pps-tabs [role="tab"] { border: 0; background: transparent; height: 40px; padding: 0 10px; color: var(--pps-muted); border-bottom: 2px solid transparent; display: inline-flex; align-items: center; gap: 6px; }
.pps-tabs [role="tab"][aria-selected="true"] { color: var(--pps-fg); font-weight: 600; border-bottom-color: var(--pps-accent); }
.pps-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--pps-warn); }
.pps-chat { flex: 1; min-height: 0; overflow: auto; padding: 12px; display: flex; flex-direction: column; gap: 12px; }
.pps-msg { line-height: 1.6; overflow-wrap: anywhere; white-space: pre-wrap; }
.pps-msg.user { align-self: flex-end; max-width: 88%; background: var(--pps-soft); border-radius: 12px 12px 4px 12px; padding: 8px 11px; }
.pps-msg.user .ref { display: block; font-size: 11px; color: var(--pps-muted); margin-bottom: 2px; }
.pps-msg.bot { color: var(--pps-fg); }
.pps-toolcard { border: 1px solid var(--pps-border); border-radius: 9px; overflow: hidden; }
.pps-toolcard .th { display: flex; align-items: center; gap: 8px; padding: 7px 10px; background: var(--pps-soft); font: 500 12px var(--pps-mono); }
.pps-toolcard .th .pps-pill { margin-left: auto; font-family: inherit; }
.pps-toolcard .tb { padding: 8px 10px; font-size: 12px; color: var(--pps-muted); display: flex; flex-direction: column; gap: 6px; }
.pps-toolcard .tb .acts { display: flex; gap: 6px; flex-wrap: wrap; }
.pps-working { display: flex; align-items: center; gap: 8px; color: var(--pps-muted); font-size: 12px; }
.pps-working i { width: 6px; height: 6px; border-radius: 50%; background: var(--pps-accent); animation: pps-pulse 1s ease-in-out infinite; }
@keyframes pps-pulse { 50% { opacity: .25; } }
.pps-suggest { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 10px 8px; }
.pps-suggest button { border: 1px solid var(--pps-border); background: var(--pps-card); border-radius: 999px; padding: 3px 10px; font-size: 12px; color: var(--pps-muted); }
.pps-suggest button:hover:not(:disabled) { color: var(--pps-fg); border-color: var(--pps-faint); }
.pps-composer { flex: none; margin: 0 10px 10px; border: 1px solid var(--pps-border); border-radius: 12px; background: var(--pps-card); }
.pps-composer:focus-within { border-color: var(--pps-accent); box-shadow: 0 0 0 3px var(--pps-accent-soft); }
.pps-refs { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 8px 0; }
.pps-ref { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 3px 0 8px; border-radius: 6px; background: var(--pps-accent-soft); color: var(--pps-accent); font-size: 11.5px; max-width: 100%; }
.pps-ref span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pps-ref button { border: 0; background: transparent; width: 16px; height: 16px; display: grid; place-items: center; color: inherit; border-radius: 4px; padding: 0; }
.pps-composer textarea { display: block; width: 100%; border: 0; outline: none; resize: none; background: transparent; padding: 8px 10px; min-height: 58px; }
.pps-cfoot { display: flex; align-items: center; gap: 6px; padding: 0 8px 8px; }
.pps-cfoot .q { font-size: 11.5px; color: var(--pps-muted); }
.pps-send { margin-left: auto; width: 30px; height: 30px; border-radius: 8px; border: 0; background: var(--pps-primary); color: var(--pps-on-primary); display: grid; place-items: center; }

/* splitters */
.pps-split { position: absolute; z-index: 6; touch-action: none; }
.pps-split::after { content: ""; position: absolute; background: var(--pps-accent); opacity: 0; transition: opacity .12s; border-radius: 2px; }
.pps-split:hover::after, .pps-split.drag::after, .pps-split:focus-visible::after { opacity: 1; }
.pps-split:focus-visible { outline: none; }
.pps-split.v { top: 8px; bottom: 8px; width: 8px; cursor: col-resize; }
.pps-split.v::after { top: 0; bottom: 0; left: 3px; width: 2px; }
.pps-split.h { left: 8px; right: 8px; height: 8px; top: -8px; cursor: row-resize; }
.pps-split.h::after { left: 0; right: 0; top: 3px; height: 2px; }
.pps-right .pps-split { left: -8px; }

/* present + toast */
.pps-present { position: fixed; inset: 0; z-index: 1000; background: #000; display: grid; place-items: center; container-type: size; }
.pps-present > .pps-slide-box { width: min(100cqw, calc(100cqh * 16 / 9)); border-radius: 0; }
.pps-present .px { position: absolute; top: 12px; right: 12px; display: flex; gap: 8px; align-items: center; color: #bbb; font-size: 12px; }
.pps-present .px button { border: 1px solid #444; background: #111; color: #ddd; border-radius: 7px; height: 28px; padding: 0 10px; }
.pps-toast { position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 60; background: var(--pps-primary); color: var(--pps-on-primary); font-size: 12.5px; padding: 7px 14px; border-radius: 8px; box-shadow: var(--pps-shadow); max-width: calc(100% - 32px); }

/* chat tool card (outside .pps) */
.pps-chatcard { border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.1)); border-radius: 10px; padding: 10px 12px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; background: var(--dsw-alias-bg-layer-1, transparent); color: var(--dsw-alias-label-primary, inherit); font-size: 13px; }
.pps-chatcard .ic { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.05)); flex: none; }
.pps-chatcard .tx { min-width: 0; flex: 1; }
.pps-chatcard .tx b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pps-chatcard .tx span { color: var(--dsw-alias-label-secondary, #667085); font-size: 12px; }
.pps-chatcard .acts { display: flex; gap: 6px; }
.pps-chatcard button { height: 28px; padding: 0 10px; border-radius: 7px; border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.1)); background: transparent; color: inherit; cursor: pointer; font: inherit; font-size: 12.5px; }
.pps-chatcard button.primary { background: var(--dsw-alias-button-primary-fill, #1b2330); color: var(--dsw-alias-label-primary-inverted, #fff); border-color: transparent; }
.pps-chatcard.err { color: var(--dsw-alias-state-error-primary, #d93026); }

/* narrow panel: stage + filmstrip; side panels become sheets over the stage */
@container pps (max-width: 820px) {
  .pps-grid { grid-template-areas: "header" "stage" "strip"; grid-template-columns: minmax(0, 1fr); grid-template-rows: 3rem minmax(0, 1fr) var(--pps-strip-n); }
  .pps-sheet { margin: 0 8px 8px 8px; }
  .pps-right { position: absolute; top: calc(3rem + 4px); bottom: 0; right: 0; z-index: 30; width: min(400px, calc(100% - 16px)); box-shadow: var(--pps-shadow); }
  .pps-split { display: none; }
  .pps-chip .nm, .pps-btn .lb, .pps-wide { display: none; }
}
@media (prefers-reduced-motion: reduce) { .pps *, .pps-chatcard * { transition: none !important; animation: none !important; } }
`

let injected = false
export function ensureStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true
  const style = document.createElement('style')
  style.id = 'dsh-ppt-studio-style'
  style.textContent = CSS
  document.head.appendChild(style)
}
