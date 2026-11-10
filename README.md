# dsh-ppt-studio

A presentation workbench inside DeepSeek Harness. Collect source material, prepare an outline, design free-form HTML/CSS/SVG slides with the agent, and deliver PDF, HTML, or an editable project bundle.

[中文文档](README.zh.md) · [MVP architecture and acceptance checklist](docs/mvp.md)

## Run from source

This MVP is implemented in source and has not been published yet.

```bash
npm ci
npm run build
dsh plugin --profile web add /absolute/path/to/dsh-ppt-studio
```

Restart DSH Web and open **PPT Studio**. Create a project, paste text or upload Markdown and images, edit and confirm the outline, then design representative pages before completing the deck. AI buttons directly start DSH host sessions, with progress, feedback, cancellation and retry in the workbench. Approve the outline, then approve the representative slides before generating the rest. Tasks survive browser navigation; interrupted host tasks require an explicit retry. Scoped page revisions cannot write to other slides. Agent writes automatically appear in the workbench. The plugin uses DSH's existing model configuration; it does not store API keys.

The canvas is 1280×720 with no fixed layout taxonomy. Preview and PDF share the same static HTML renderer. Project JSON embeds sources, images and page code and can be imported for further editing. Revision history and optimistic concurrency checks protect saved work. New projects do not export PPTX; legacy `ppt_studio_create` and `ppt_studio_themes` remain compatible.

## Configuration

Set plugin `outputDir` or `DSH_PPT_STUDIO_OUTPUT_DIR`. Projects are stored beneath `.ppt-studio/` in that directory (default: DSH process working directory), shared across this DSH instance.

PDF export and layout checks need local Chromium/Chrome. Set `DSH_PPT_CHROMIUM_PATH` for a custom executable; common Linux paths are detected automatically. No browser is downloaded by the package. Only in containers that require it, explicitly set `DSH_PPT_NO_SANDBOX=1`.

## Test

```bash
npm run typecheck
npm test
DSH_TEST_URL='<authenticated DSH URL>' npm run test:e2e
```

Keep the authenticated URL private. E2E uses a real DSH host and deterministic slide writes; it does not claim to test live model generation. For opt-in live acceptance, configure DSH, set `DSH_LIVE_TEST=1`, and run `npm run test:live` with the authenticated URL. This test consumes model usage.

## License

MIT. Community plugin, not affiliated with DeepSeek.
