# dsh-ppt-studio

面向 DeepSeek Harness 的 Agent-first 演示文稿工作室。通过多轮迭代，把一句话或 Markdown 大纲变成可直接交付的幻灯片。

## 功能

- `ppt_studio_create` — 把标题和 Markdown 内容生成 `*.pptx`、`*.html` 与 `*.json` 三件套。
- `ppt_studio_themes` — 列出 5 套内置视觉主题。
- 自带 `dsh-ppt-studio` 技能，教会 agent 按「理解 → 规划 → 起草 → 生成 → 审阅 → 迭代」的流程工作。

## 安装

从 npm 安装（推荐）：

```bash
dsh plugin --profile web add iamsuosi-dsh-ppt-studio
```

从 GitHub 源码安装：

```bash
dsh plugin --profile web add github:iamsuosi/dsh-ppt-studio
```

安装后重启 DSH。

## 快速开始

1. 查看主题：
   ```
   ppt_studio_themes
   ```

2. 生成演示文稿：
   ```
   ppt_studio_create {
     title: "为什么采用 Rust",
     content: "## 为什么选 Rust？\n- 无 GC 的内存安全\n- 类型系统内建 fearless concurrency\n\n## 性能\n- 零成本抽象\n- 运行时表现接近 C/C++",
     theme: "data",
     lang: "zh"
   }
   ```

3. 用浏览器打开返回的 HTML 路径，用 PowerPoint / WPS / Keynote 编辑 PPTX。

## 配置

可选配置：

```yaml
- id: dsh-ppt-studio
  config:
    outputDir: ./decks
    defaultTheme: data
    defaultLang: zh
    maxSlides: 30
```

也支持环境变量 `DSH_PPT_STUDIO_OUTPUT_DIR`。

## 主题

| ID | 名称 | 情绪 | 适用场景 |
|----|------|------|----------|
| `data` | 数据漂移 | 未来、沉浸 | AI / 研究 / 技术发布 |
| `swiss` | 瑞士脉冲 | 精准、理性 | SaaS / 数据 / 开发者工具 |
| `velvet` | 天鹅绒标准 | 高级、克制 | 高管汇报 / 品牌 / 融资路演 |
| `soft` | 柔和信号 | 温暖、人本 | 品牌故事 / 培训 |
| `bold` | 极繁大字 | 大声、动能 | 产品发布 / 活动 |

## 协议

MIT。社区插件，与 DeepSeek 官方无关。
