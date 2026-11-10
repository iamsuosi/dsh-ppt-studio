# dsh-ppt-studio

DeepSeek Harness 内的 PPT 工作台：整理材料、准备大纲、让 AI 自由设计每页、审阅并交付 PDF / HTML。

## 开始使用

这一版 MVP 在源码中实现，尚未发布。安装本地构建：

```bash
npm ci
npm run build
dsh plugin --profile web add /absolute/path/to/dsh-ppt-studio
```

重启 DSH Web，打开侧栏 **PPT Studio**：

1. 新建项目，粘贴需求或上传文本、Markdown、PNG/JPEG/WebP 图片。
2. 填写可选的听众、目标、视觉方向。按章节提取大纲草稿，或点击「让 AI 规划」。
3. 编辑大纲、排序并确认；先让 AI 设计代表页，点击「接受视觉方向」后再完成全部页面。
4. 在工作台查看逐页结果和讲稿。AI 保存结果会自动同步；本地手工修改需要保存。
5. 检查页面并下载 PDF、HTML 或可重新导入的项目 JSON。可从历史修订恢复。

AI 使用 DSH 默认模型，工作台直接启动宿主会话，显示进度和反馈，支持取消、失败重试。任务不依赖浏览器页面存活；宿主重启后会标记中断，由用户决定是否重试。修改当前页前填写修改意见，任务只允许写入所选页面。修改代表页视觉后需要重新接受视觉方向。插件不额外存储 API Key。

## 布局与交付

固定 1280×720 画布，布局不固定。每页由 AI 编写静态 HTML/CSS/SVG，图片引用项目内素材。预览与 PDF 使用同一内容。新流程不支持 PPTX；旧 `ppt_studio_create` 和 `ppt_studio_themes` 接口保留兼容。

## 配置与验证

```yaml
- id: dsh-ppt-studio
  config:
    outputDir: ./decks
```

项目放在 `<outputDir>/.ppt-studio/`，默认使用 DSH 进程工作目录，可用 `DSH_PPT_STUDIO_OUTPUT_DIR` 覆盖。项目库在同一个 DSH 实例内共享。

PDF 和页面检查需要本机 Chromium/Chrome。默认探测常见 Linux 路径，或设置 `DSH_PPT_CHROMIUM_PATH`。插件不自动下载浏览器。受限容器可按需显式设置 `DSH_PPT_NO_SANDBOX=1`。

```bash
npm run typecheck
npm test
# 对已启动且安装了本地插件的 DSH 进行真实浏览器测试
DSH_TEST_URL='<authenticated DSH URL>' npm run test:e2e
```

测试 URL 含访问令牌，请勿提交或分享。`test:e2e` 使用固定页面内容，不调用模型。配置好 DSH 模型后，显式设置 `DSH_LIVE_TEST=1` 并运行 `npm run test:live` 可验证真实的一键规划、两次确认、刷新恢复、单页修改与导出流程；该测试会产生模型用量。

详细数据规范、实现范围和验收步骤见 [MVP 文档](docs/mvp.md)。

## 协议

MIT。社区插件，与 DeepSeek 官方无关。
