# dsh-ppt-studio

Agent-first presentation studio for DeepSeek Harness. Plan, draft, review and export slide decks from a single prompt or Markdown outline.

## What it does

- `ppt_studio_create` — turn a title and Markdown content into `*.pptx`, `*.html`, and `*.json`.
- `ppt_studio_themes` — list the five built-in visual themes.
- Ships a `dsh-ppt-studio` skill that teaches the agent an iterative, multi-round workflow.

## Install

From npm (recommended):

```bash
dsh plugin --profile web add @iamsuosi/dsh-ppt-studio
```

From GitHub source:

```bash
dsh plugin --profile web add github:iamsuosi/dsh-ppt-studio
```

Restart DSH after install.

## Quick start

1. List themes:
   ```
   ppt_studio_themes
   ```

2. Create a deck:
   ```
   ppt_studio_create {
     title: "Adopting Rust",
     content: "## Why Rust?\n- Memory safety without GC\n- Fearless concurrency\n\n## Performance\n- Zero-cost abstractions\n- Predictable runtime",
     theme: "data",
     lang: "en"
   }
   ```

3. Open the returned HTML path in a browser and the PPTX in PowerPoint / WPS / Keynote.

## Configuration

Optional plugin config in your profile:

```yaml
- id: dsh-ppt-studio
  config:
    outputDir: ./decks
    defaultTheme: data
    defaultLang: zh
    maxSlides: 30
```

You can also set `DSH_PPT_STUDIO_OUTPUT_DIR` as an environment variable.

## Themes

| ID | Name | Mood | Best for |
|----|------|------|----------|
| `data` | Data Drift | futuristic, immersive | AI / research / tech launches |
| `swiss` | Swiss Pulse | precise, rational | SaaS / data / devtools |
| `velvet` | Velvet Standard | premium, restrained | executive / brand / investor |
| `soft` | Soft Signal | warm, human | brand stories / training |
| `bold` | Maximalist Type | loud, kinetic | product launches / events |

## License

MIT. Community plugin, not affiliated with DeepSeek.
