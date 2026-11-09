# Plugin submission checklist

## Repository

- Name: `dsh-ppt-studio`
- Owner: `iamsuosi` (replace with your actual GitHub username)
- URL: `https://github.com/iamsuosi/dsh-ppt-studio`

## Before submitting

1. Create the public GitHub repository and push this code.
2. Add the `dsh-plugin` topic under repo Settings → Topics.
3. Wait at least 1 day after repo creation before opening PRs.
4. Optionally publish to npm for faster installs.

## Submission A: awesome-dsh-plugin/awesome-dsh-plugin

File to add: `data/plugins/iamsuosi__dsh-ppt-studio.yml`

```yaml
url: https://github.com/iamsuosi/dsh-ppt-studio
name: iamsuosi/dsh-ppt-studio
category: docs
description:
  en: 'Agent-first presentation studio: plan, draft and export HTML + PPTX decks from a prompt or Markdown outline.'
  zh: 'Agent-first 演示文稿工作室：根据提示词或 Markdown 大纲规划、起草并导出 HTML + PPTX 演示文稿。'
```

## Submission B: cccakeee/awesome-dsh-plugins

Add one line under `## 🛠️ Tools & Capabilities` (or the Chinese equivalent):

```markdown
- [dsh-ppt-studio](https://github.com/iamsuosi/dsh-ppt-studio) — Agent-first presentation studio: plan, draft and export HTML + PPTX decks from a prompt or Markdown outline.
```

## Install command

```bash
dsh plugin --profile web add github:iamsuosi/dsh-ppt-studio
```
