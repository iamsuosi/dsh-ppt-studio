# dsh-ppt-studio

Agent-first presentation studio for DeepSeek Harness.

## Goal

Turn a user's brief into a polished slide deck through an iterative, agent-driven workflow.

## Workflow

1. **Understand** the user's goal, audience, and key message.
2. **Plan** the deck structure (cover, sections, key points, closing).
3. **Draft** the content as Markdown with `##` headings and bullet lists.
4. **Create** the deck by calling `ppt_studio_create` with the title and drafted Markdown.
5. **Review** the generated HTML/PPTX and ask the user for revisions.
6. **Iterate** by editing the Markdown and calling `ppt_studio_create` again.

## Tool reference

- `ppt_studio_themes` — list built-in themes (`data`, `swiss`, `velvet`, `soft`, `bold`).
- `ppt_studio_create` — generate `title.pptx`, `title.html`, and `title.json` from Markdown.

## Markdown rules

- `# Title` is ignored; use the `title` argument instead.
- `## Section` becomes a section divider or a bullet slide.
- Bullet lines starting with `- ` or `* ` become list items.
- A single sentence without headings expands into a 3-slide mini deck.

## Example

User: "Make a 5-slide deck about why our team should adopt Rust."

Agent:
1. Call `ppt_studio_themes` to confirm theme options.
2. Draft Markdown:
   ```markdown
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
4. Open the returned HTML path and summarize the deck to the user.
5. Iterate based on feedback.
