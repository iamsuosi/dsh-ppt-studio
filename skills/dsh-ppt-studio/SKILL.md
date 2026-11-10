# dsh-ppt-studio

Agent-first presentation studio for DeepSeek Harness.

## Goal

Turn a user's brief into a polished slide deck through an iterative, agent-driven workflow.

## Workflow

1. **Understand** the user's goal, audience, and key message.
2. **Plan** the deck structure (cover, sections, key points, closing).
3. **Draft** the content as Markdown (rules below).
4. **Create** the deck by calling `ppt_studio_create` with the title and drafted Markdown.
5. **Review** the result with the user. They can open it in the PPT Studio panel (the chat card has an "Open in PPT Studio" button), preview it, and edit it there.
6. **Iterate** by editing the Markdown and calling `ppt_studio_create` again.

## Tool reference

- `ppt_studio_themes` — list built-in themes (`data`, `swiss`, `velvet`, `soft`, `bold`).
- `ppt_studio_create` — generate `<fileName>.pptx`, `.html` and `.json` from Markdown. The JSON manifest keeps the Markdown source, so the deck can be reopened and edited.
  - `fileName` + `overwrite: true` replaces an existing deck instead of writing a numbered copy (`name-1`, `name-2`, …). Use this when revising a deck the user already has.
  - Files go to the session workspace unless `outputDir` or the plugin config says otherwise.

## Markdown rules

- The `title` argument is the cover title.
- A leading paragraph (before any heading) becomes the cover subtitle.
- `# Heading` becomes a section divider; the first line under it is its subtitle.
- `## Heading` with `-`, `*` or `1.` items becomes a bullet slide.
- `## Heading` with one short paragraph (under 80 characters) becomes a statement slide.
- A closing "Thank You" slide is added automatically.
- A single sentence with no headings expands into a 3-slide mini deck.

## Requests from PPT Studio

Messages that start with `[PPT Studio]` come from the studio panel. They include the deck title, theme, language, the current Markdown source, the selected slide, and the file to update. Apply the request to that Markdown, then call `ppt_studio_create` with the full `title` and `content`. When a file is named, pass its `fileName` with `overwrite: true`. The studio loads the result automatically. Keep the reply short: say what changed.

## Example

User: "Make a 5-slide deck about why our team should adopt Rust."

Agent:
1. Call `ppt_studio_themes` to confirm theme options.
2. Draft Markdown:
   ```markdown
   Why our backend team should move new services to Rust.

   ## Why Rust?
   - Memory safety without garbage collection
   - Fearless concurrency built into the type system

   ## Performance
   - Zero-cost abstractions
   - Predictable runtime comparable to C/C++

   ## Engineering Velocity
   - Expressive type system catches bugs early
   - Great tooling with cargo and rustfmt
   ```
3. Call `ppt_studio_create` with `title: "Adopting Rust"`, `theme: "data"`, `lang: "en"`.
4. Tell the user the deck is ready and that they can open it in PPT Studio.
5. Iterate based on feedback.
