# PPT Studio MVP：实现与验收

## 产品范围

先完成 PPT。用户输入文本、Markdown、图片及可选 brief（听众、目标、视觉方向）；AI 使用 DSH 的现有模型与工具。16:9 画布固定，页面布局不套固定模板，支持任意静态 HTML/CSS/SVG。HTML、PDF、可编辑项目 JSON 为交付物，新流程不提供 PPTX。

## 已实现

- 材料上传、原文保留、换行/NUL 清理、文件类型与大小限制；项目内图片自包含。
- 按 Markdown 章节提取可编辑草稿，明确标注这是规则提取；语义归纳、叙事重排与 brief 推断交给 DSH Agent。
- 大纲标题、核心结论、要点、讲稿编辑，增删、排序、人工确认。
- 按稳定 Slice ID 写入页面；自由 HTML/CSS/SVG、图片素材引用、逐页状态、预览自动刷新。
- 四阶段工作台，页面列表、中央预览、AI 操作区、讲稿、来源和交付入口。
- 工作台一键启动 DSH 任务，显示状态、AI 文本反馈，支持取消和重试；先代表页、人工接受视觉方向，再生成全部页面。单页任务在工具执行层限制写入范围。
- 同源鉴权 API；UI 与 Agent 工具共用服务与磁盘项目，revision 乐观锁防止覆盖。
- 每次保存保留修订，恢复创建新修订；项目 JSON 导入时创建新 ID。
- HTML/PDF 使用同一渲染器；项目 JSON 包含全部素材、图片和源码，支持离线搬运。
- 图片缺失、文字越界与可能裁切的 Chromium 检查（提示性，不能替代视觉审阅）。

## 技术结构

| 文件 | 职责 |
| --- | --- |
| `src/project.ts` | 项目/Slice 类型、运行时校验、原文提取、原子更新、修订 |
| `src/studio-service.ts` | UI 和工具共享操作；Fetch API 与下载响应 |
| `src/studio-tasks.ts` | 宿主会话创建、任务持久化、项目写锁、范围限制、取消与失败恢复 |
| `src/studio-tools.ts` | `ppt_studio_project` Agent 工具；图片以文件路径返回，避免 base64 占用模型上下文 |
| `src/web-renderer.ts` | 静态 HTML 清理、隔离预览、打印、页面检查 |
| `templates/client.js` | DSH React 插件工作台，无独立应用或模型 Key 存储 |
| `test/project.test.mjs` | 流程、并发冲突、恢复、输入边界、渲染隔离测试 |
| `test/e2e.mjs` | 真实 DSH + Chromium 的确定性端到端测试 |

### 数据规范

`Project.schemaVersion=1`，包含 `id/revision/title/brief/sources/assets/slides/outlineConfirmed`，新增可选的 `review:{sampleIds,approved}`。旧项目读取时补默认未审阅状态；重新确认大纲会选取首页和中间页作为代表页。

每页 Slice：

```json
{
  "id": "stable-slide-id",
  "title": "页面标题",
  "intent": "这一页希望表达的核心结论",
  "points": ["有来源支持的要点"],
  "sourceIds": ["source-1"],
  "notes": "讲稿",
  "html": "<main><h1>自由表达</h1></main>",
  "css": "main{padding:80px}h1{font-size:84px}",
  "status": "ready"
}
```

页面为 `1280×720`。`html` 是 body 片段，`css` 独立；初始内容为空且 `status=outline`。图片写 `<img src="asset:ID" alt="说明">`，CSS 背景也可用 `url(asset:ID)`。不运行生成代码中的 JavaScript，不依赖外链字体/CDN。SVG 支持常见形状、路径、文本、渐变和裁剪；不承诺任意 Web API 或 React 组件运行时。

数据放在 `<outputDir>/.ppt-studio/<projectId>/`，内含 `project.json`、`revisions/`、`assets/` 和按 revision 命名的导出文件。默认目录为 DSH 进程工作目录；`DSH_PPT_STUDIO_OUTPUT_DIR` 可覆盖。MVP 是同一 DSH 实例下的共享项目库，尚未按 DSH workspace 隔离。

`POST /api/ppt-studio` 在 DSH `connection.fetch` 注册，复用宿主 Cookie、Host/Origin 与 owner 鉴权。无额外监听端口。工具在无 Web 服务的 DSH 中仍可使用。

HTML 预览采用无权限 sandbox iframe 和 CSP，页面样式不会污染工作台。PDF 使用 playwright-core 驱动本机 Chromium，等待字体与图片解码，禁用远端请求，按 1280×720 打印。PDF 保留可选取的文字；不做图片式整页栅格化。

## 验证

```bash
npm ci
npm run typecheck
npm test
# 先安装本地插件并重启 DSH，设置临时测试 URL（包含令牌，不要提交）
DSH_TEST_URL='<authenticated DSH URL>' npm run test:e2e
```

配置 `DSH_PPT_CHROMIUM_PATH` 可指定 Chrome/Chromium。受限容器若必须关闭 Chromium 沙箱，可显式设置 `DSH_PPT_NO_SANDBOX=1`；普通环境默认使用沙箱。浏览器测试同样读取这两个变量。

测试脚本使用固定页面写入，覆盖真实 UI、宿主 API、预览、下载、恢复、导入、重载。它不能证明模型能正确完成工具调用。真实模型验收需最后在 DSH 设置中配置 Key，再验证以下场景：

1. 从用户材料中推断 brief，生成有来源的大纲；不虚构事实。
2. 用户确认大纲后先产出代表页，确认视觉方向后完成全部页面。
3. 指定一页修改，其他页保持不变，冲突时读取新 revision 后重试。
4. 检查页面，按反馈修改，再导出 PDF/HTML/项目文件。

## 尚未纳入本轮

- 完整通用聊天面板和流式逐 token 文本；当前工作台提供任务操作、进度和已完成的 AI 文本反馈。
- React/JS 页面执行、拖拽设计器、动画、模板市场。
- PDF/Word/PPTX 输入解析、在线搜索、自动素材检索与图像生成。
- PPTX 导出、多人协作、跨进程写入锁、工作区级项目隔离。
- 自动视觉评分和修复循环；当前检查不能证明页面美观或全部文本均可读。

## 真实模型验收记录（2026-11-09）

已使用 Kimi Coding 官方接口 `https://api.kimi.com/coding/v1`，从模型列表获取 `k3`，验证原生调用返回 200。随后通过真实 DSH Web 会话运行 `ppt_studio_project`，完成两页大纲、确认、逐页 HTML/CSS/SVG 生成、页面检查及 PDF/HTML 导出。另一次模型调用只修改第二页讲稿，自动比对确认第一页全部字段以及第二页 HTML/CSS 保持不变。

视觉复核发现 SVG 根元素的 `fill="none"` 被清理器移除，已补充根元素绘图属性白名单并加入回归断言。修复后重新检查、截图和导出；两页均无图片缺失或文字越界提示，PDF 为两页 16:9。15 项自动测试通过。此记录验证了这一个小型样例，不代表所有输入或视觉设计质量均已覆盖。


## 工作台任务与两次审阅

`task-start/status/cancel/retry` 通过现有鉴权接口提供服务。任务文件独立保存在项目目录的 `task.json`，包含会话 ID、目标页、意见、模型、状态、进度和有限数量的 AI 文本反馈（不展示推理内容）。网页刷新后重新读取任务；服务端持有 Agent 生命周期，浏览器关闭不取消任务。宿主重启时未结束的任务标记为 interrupted，禁止静默重新提交收费请求。

每个项目最多一个活动任务，运行期间拒绝外部写入。工作台会话只暴露项目工具的受限版本：规划只能读取和保存本项目大纲，不能改原始材料或自行确认；设计只能写指定页并检查页面，不能改其他页或自行批准视觉方向。全套生成要求 `review.approved=true`；修改代表页 HTML/CSS 会撤销视觉确认。取消会等待当前 Agent 退出后释放项目写锁，保留已保存结果。

`npm run test:live` 是显式开启的真实模型测试，需要 `DSH_LIVE_TEST=1` 与 `DSH_TEST_URL`。与默认确定性浏览器测试分开，避免普通回归产生模型用量。

### 工作台直连验收（2026-11-09）

在真实 DSH + Kimi Coding `k3` 上，从工作台按钮完成了三页项目的规划、大纲人工确认、两张代表页生成、视觉人工确认、剩余页生成、指定页讲稿修改和 PDF/HTML/项目下载。代表页生成期间刷新浏览器，任务保持运行并恢复显示；单页修改后逐字段比对确认其他两页未改变。导出 PDF 为三页 16:9，页面检查通过，浏览器无运行异常。

另以图片中的品牌文字（未出现在文件名或文本材料中）测试图像输入，模型正确识别并用于大纲标题；真实工作台取消操作也已验证。22 项自动测试、确定性浏览器测试、类型检查和打包内容检查通过。失败重试与宿主重启后的 interrupted 状态由隔离测试覆盖；尚未将这些结果推广为多页复杂材料的质量保证。
