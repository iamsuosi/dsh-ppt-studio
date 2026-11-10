window.__ModuleLoader__.load({
  id: "@iamsuosi/dsh-ppt-studio",
  factory(require) {
    const React = require("react"),
      h = React.createElement;
    const { useState, useEffect, useRef } = React;
    const CSS = `
.ppt-app{height:100%;overflow:auto;background:#f5f6f8;color:#202b3e;font:14px/1.5 system-ui,sans-serif;padding:28px;box-sizing:border-box}
.ppt-app *{box-sizing:border-box}.ppt-app h1,.ppt-app h2,.ppt-app h3,.ppt-app p{margin:0}.ppt-app h1{font-size:25px;letter-spacing:-.6px}.ppt-app h2{font-size:18px}.ppt-app h3{font-size:14px}.ppt-muted{color:#707b8e;font-size:12px}.ppt-top,.ppt-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.ppt-top{justify-content:space-between;margin-bottom:24px}.ppt-app button{border:1px solid #dce1e9;background:white;color:#28334a;border-radius:8px;padding:9px 14px;font:inherit;cursor:pointer}.ppt-app button:hover{background:#edf0f7}.ppt-app button:disabled{opacity:.45;cursor:default}.ppt-app button.primary{background:#465bd9;color:white;border-color:#465bd9}.ppt-app button.active{background:#e9edff;color:#344dc1;border-color:#bec9ff}.ppt-app input,.ppt-app textarea,.ppt-app select{width:100%;border:1px solid #dce1e9;border-radius:8px;padding:10px 12px;background:white;color:#202b3e;font:inherit}.ppt-app textarea{resize:vertical;min-height:110px}.ppt-app label{display:block;font-size:12px;font-weight:600;margin-bottom:14px}.ppt-app label>span{display:block;margin-bottom:6px}.ppt-tabs{display:flex;gap:6px;border-bottom:1px solid #dce1e9;margin:20px 0;padding-bottom:12px}.ppt-card{border:1px solid #e0e5ed;border-radius:12px;background:white;padding:22px}.ppt-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.ppt-workbench{display:grid;grid-template-columns:220px minmax(0,1fr) 260px;gap:16px;align-items:start}.ppt-stack{display:grid;gap:12px}.ppt-slide-button{width:100%;text-align:left}.ppt-badge{font-size:11px;border-radius:20px;background:#edf0f6;padding:4px 9px;color:#59667d}.ppt-notice{padding:11px 15px;background:#eef2ff;border:1px solid #d7dffb;border-radius:8px;margin-bottom:16px;white-space:pre-wrap}.ppt-error{background:#fff1f0;border-color:#ffd1cb;color:#a32929}.ppt-preview{width:100%;aspect-ratio:16/9;overflow:hidden;background:#e8ebf0;border-radius:8px;position:relative}.ppt-preview iframe{border:0;width:1280px;height:720px;transform-origin:top left;display:block;background:white}.ppt-empty{padding:64px 22px;text-align:center;color:#6e7890}.ppt-projects{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}.ppt-projects button{text-align:left;padding:22px}.ppt-assets{display:flex;gap:8px;flex-wrap:wrap}.ppt-assets img{height:64px;width:90px;object-fit:cover;border-radius:6px}.ppt-code{font-family:ui-monospace,monospace!important;font-size:12px!important}.ppt-app .ppt-danger{color:#b13d3d}.ppt-app details{margin-top:16px}.ppt-app summary{cursor:pointer;color:#5265bf}.ppt-app :focus-visible{outline:2px solid #6076ee;outline-offset:2px}@media(max-width:1100px){.ppt-workbench{grid-template-columns:180px minmax(0,1fr)}.ppt-inspector{grid-column:1/-1}.ppt-grid{grid-template-columns:1fr}}`;
    async function api(action, args = {}, download = false) {
      const response = await fetch("/api/ppt-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, args }),
      });
      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "请求失败" }));
        throw new Error(error.error);
      }
      return download ? response.blob() : response.json();
    }
    const btn = (label, onClick, props = {}) =>
      h("button", { type: "button", onClick, ...props }, label);
    const field = (label, value, onChange, area = false, props = {}) =>
      h(
        "label",
        null,
        h("span", null, label),
        h(area ? "textarea" : "input", {
          value,
          onChange: (e) => onChange(e.target.value),
          ...props,
        }),
      );
    const uid = () => crypto.randomUUID();
    function Frame({ html, title }) {
      const ref = useRef(null),
        [scale, setScale] = useState(0.5);
      useEffect(() => {
        const o = new ResizeObserver(([entry]) =>
          setScale(entry.contentRect.width / 1280),
        );
        if (ref.current) o.observe(ref.current);
        return () => o.disconnect();
      }, []);
      return h(
        "div",
        { className: "ppt-preview", ref },
        html
          ? h("iframe", {
              title,
              sandbox: "",
              srcDoc: html,
              style: { transform: `scale(${scale})` },
            })
          : h("div", { className: "ppt-empty" }, "等待 AI 设计这一页"),
      );
    }
    let activeDraft = null;
    function Panel() {
      const [projects, setProjects] = useState([]),
        [project, setProject] = useState(activeDraft?.project || null),
        [dirty, setDirty] = useState(activeDraft?.dirty || false);
      const [tab, setTab] = useState(activeDraft?.tab || "materials"),
        [selected, setSelected] = useState(activeDraft?.selected || 0),
        [preview, setPreview] = useState("");
      const [notice, setNotice] = useState(""),
        [error, setError] = useState(""),
        [busy, setBusy] = useState(false),
        [history, setHistory] = useState([]);
      const [creating, setCreating] = useState(false),
        [title, setTitle] = useState(""),
        [content, setContent] = useState(""),
        [task, setTask] = useState(null);
      const [feedback, setFeedback] = useState(activeDraft?.feedback || ""),
        [aiAvailable, setAiAvailable] = useState(false),
        [syncError, setSyncError] = useState("");
      const aiRunning =
        task && ["queued", "running", "canceling"].includes(task.status);
      activeDraft = { project, dirty, tab, selected, feedback };
      useEffect(() => {
        if (
          task &&
          ["completed", "failed", "canceled", "interrupted"].includes(
            task.status,
          )
        )
          setNotice(task.progress);
      }, [task?.id, task?.status]);
      useEffect(() => {
        if (!dirty) return;
        const warn = (event) => {
          event.preventDefault();
          event.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
      }, [dirty]);
      const dirtyRef = useRef(dirty);
      dirtyRef.current = dirty;
      const projectRef = useRef(project);
      projectRef.current = project;
      async function run(fn) {
        setBusy(true);
        setError("");
        try {
          return await fn();
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }
      async function refresh() {
        setProjects(await api("list"));
      }
      useEffect(() => {
        run(refresh);
      }, []);
      useEffect(() => {
        if (!project) return;
        let gone = false,
          pending = false;
        const sync = async () => {
          if (pending) return;
          pending = true;
          try {
            const status = await api("task-status", { id: project.id });
            if (gone) return;
            setTask(status.task);
            setAiAvailable(status.available);
            setSyncError("");
            if (!dirtyRef.current) {
              const latest = await api("get", { id: project.id });
              if (
                !gone &&
                !dirtyRef.current &&
                projectRef.current?.id === latest.id &&
                latest.revision > projectRef.current.revision
              )
                setProject(latest);
            }
          } catch (e) {
            if (!gone) setSyncError("同步暂时失败：" + e.message);
          } finally {
            pending = false;
          }
        };
        sync();
        const timer = setInterval(sync, 1500);
        return () => {
          gone = true;
          clearInterval(timer);
        };
      }, [project?.id]);
      const slide = project?.slides[selected];
      useEffect(() => {
        let cancelled = false;
        setPreview("");
        if (project && slide?.status === "ready")
          api("preview", { id: project.id, slideId: slide.id })
            .then((r) => {
              if (!cancelled) setPreview(r.html);
            })
            .catch((e) => {
              if (!cancelled) setError(e.message);
            });
        return () => {
          cancelled = true;
        };
      }, [project?.id, project?.revision, slide?.id]);
      function edit(fn) {
        setProject((p) => fn(structuredClone(p)));
        setDirty(true);
      }
      function editSlide(fn, invalidate = true) {
        edit((p) => {
          fn(p.slides[selected]);
          if (invalidate) {
            p.outlineConfirmed = false;
            p.slides[selected].status = "outline";
            p.slides[selected].html = "";
            p.slides[selected].css = "";
          }
          return p;
        });
      }
      async function save() {
        const p = await api("save", {
          project,
          expectedRevision: project.revision,
        });
        setProject(p);
        setDirty(false);
        setNotice("已保存");
        return p;
      }
      async function act(action, args = {}) {
        const p = await api(action, {
          id: project.id,
          expectedRevision: project.revision,
          ...args,
        });
        setProject(p);
        setDirty(false);
        return p;
      }
      async function taskFor(mode) {
        if (dirty) throw new Error("请先保存修改");
        if (aiRunning) throw new Error("请等待当前任务完成或取消");
        const next = await api("task-start", {
          id: project.id,
          expectedRevision: project.revision,
          mode,
          slideId: slide?.id,
          feedback,
        });
        setTask(next);
        setFeedback("");
        setNotice("AI 任务已启动，切换页面或刷新不会中断生成。");
      }
      async function download(format) {
        if (dirty) throw new Error("请先保存修改");
        const blob = await api("export", { id: project.id, format }, true);
        const url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download = `${project.title.replace(/[\\/:*?"<>|]/g, "_")}.${format}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setNotice("导出完成");
      }
      async function files(event, images) {
        const files = Array.from(event.target.files);
        event.target.value = "";
        await run(async () => {
          const items = [];
          for (const file of files) {
            if (images) {
              if (
                !["image/png", "image/jpeg", "image/webp"].includes(
                  file.type,
                ) ||
                file.size > 5 * 1024 * 1024
              )
                throw new Error("仅支持 5 MB 以内的 PNG/JPEG/WebP 图片");
              const dataUrl = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(r.result);
                r.onerror = reject;
                r.readAsDataURL(file);
              });
              items.push({ id: uid(), name: file.name, dataUrl });
            } else {
              if (
                !/\.(txt|md|markdown)$/i.test(file.name) ||
                file.size > 200000
              )
                throw new Error("仅支持 200 KB 以内的文本和 Markdown");
              items.push({
                id: uid(),
                name: file.name,
                text: (await file.text())
                  .replace(/\r\n?/g, "\n")
                  .replace(/\u0000/g, ""),
              });
            }
          }
          edit((p) => {
            p[images ? "assets" : "sources"].push(...items);
            return p;
          });
        });
      }
      function open(p) {
        setProject(p);
        setSelected(0);
        setDirty(false);
        setTab("materials");
        setTask(null);
        setFeedback("");
        setNotice("");
      }
      const taskBox =
        project &&
        h(
          "section",
          {
            className: "ppt-card ppt-stack",
            style: { marginTop: 16 },
            "aria-label": "AI 任务状态",
          },
          h(
            "div",
            { className: "ppt-row" },
            h("h3", null, "AI 助手"),
            task &&
              h(
                "span",
                { className: "ppt-badge" },
                {
                  queued: "排队中",
                  running: "运行中",
                  canceling: "正在取消",
                  completed: "已完成",
                  failed: "失败",
                  canceled: "已取消",
                  interrupted: "已中断",
                }[task.status],
              ),
            task?.model && h("span", { className: "ppt-muted" }, task.model),
          ),
          h(
            "p",
            { className: "ppt-muted" },
            aiAvailable
              ? "直接使用 DSH 默认模型。任务在宿主端继续执行，已保存的结果自动同步。"
              : "等待 DSH 会话服务就绪",
          ),
          syncError && h("p", { role: "alert" }, syncError),
          task && h("p", { role: "status" }, task.progress),
          task?.error &&
            h(
              "div",
              { className: "ppt-notice ppt-error", role: "alert" },
              task.error,
            ),
          aiRunning &&
            btn(
              "取消任务",
              () =>
                run(async () =>
                  setTask(
                    await api("task-cancel", {
                      id: project.id,
                      taskId: task.id,
                    }),
                  ),
                ),
              { disabled: busy || task.status === "canceling" },
            ),
          task &&
            ["failed", "canceled", "interrupted"].includes(task.status) &&
            btn(
              "重试任务",
              () =>
                run(async () => {
                  if (dirty) throw new Error("请先保存修改");
                  setTask(
                    await api("task-retry", {
                      id: project.id,
                      taskId: task.id,
                      expectedRevision: project.revision,
                    }),
                  );
                }),
              { disabled: busy },
            ),
          task?.messages?.length > 0 &&
            h(
              "details",
              null,
              h("summary", null, "查看 AI 反馈"),
              h(
                "div",
                {
                  style: {
                    maxHeight: 220,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                  },
                },
                ...task.messages.map((message, i) =>
                  h("p", { key: i, style: { marginTop: 10 } }, message),
                ),
              ),
            ),
          field("任务补充 / 修改意见", feedback, setFeedback, true, {
            disabled: !!aiRunning,
            placeholder:
              "例如：面向非技术听众；或把当前页改成左右对比，保留事实和数据。",
          }),
        );
      const materials =
        project &&
        h(
          "div",
          { className: "ppt-grid" },
          h(
            "section",
            { className: "ppt-card" },
            h("h2", null, "演示目标"),
            h(
              "p",
              { className: "ppt-muted", style: { marginBottom: 20 } },
              "从已有内容出发。未填写的偏好可由 AI 提出建议。",
            ),
            field("项目标题", project.title, (v) =>
              edit((p) => ({ ...p, title: v })),
            ),
            ...["audience", "goal", "style"].map((key, i) =>
              field(
                ["听众", "希望听众理解或采取的行动", "视觉方向 / 品牌要求"][i],
                project.brief[key],
                (v) =>
                  edit((p) => {
                    p.brief[key] = v;
                    return p;
                  }),
                key === "goal",
              ),
            ),
            h(
              "div",
              { className: "ppt-row" },
              btn(
                "从材料提取大纲",
                () =>
                  run(async () => {
                    if (dirty) throw new Error("请先保存材料");
                    await act("prepare");
                    setTab("outline");
                    setNotice(
                      "已按材料章节提取草稿，尚未进行 AI 叙事整理。请编辑或交给 AI 规划。",
                    );
                  }),
                { disabled: busy },
              ),
              btn("让 AI 规划", () => run(() => taskFor("outline")), {
                className: "primary",
                disabled: busy || aiRunning || !aiAvailable,
              }),
            ),
          ),
          h(
            "section",
            { className: "ppt-card" },
            h("h2", null, "输入材料"),
            h(
              "p",
              { className: "ppt-muted" },
              "支持文本、Markdown、PNG/JPEG/WebP；保留原文用于追溯。",
            ),
            ...project.sources.map((s, i) =>
              h(
                "div",
                { key: s.id, style: { marginTop: 16 } },
                field(
                  s.name,
                  s.text,
                  (v) =>
                    edit((p) => {
                      p.sources[i].text = v;
                      return p;
                    }),
                  true,
                ),
                btn(
                  "移除材料",
                  () =>
                    edit((p) => {
                      p.sources.splice(i, 1);
                      p.slides.forEach(
                        (s) =>
                          (s.sourceIds = s.sourceIds.filter(
                            (id) => id !== project.sources[i].id,
                          )),
                      );
                      p.outlineConfirmed = false;
                      return p;
                    }),
                  { className: "ppt-danger" },
                ),
              ),
            ),
            btn("添加文本", () =>
              edit((p) => {
                p.sources.push({ id: uid(), name: "补充材料", text: "" });
                return p;
              }),
            ),
            h(
              "label",
              { style: { marginTop: 16 } },
              h("span", null, "上传文本 / Markdown"),
              h("input", {
                type: "file",
                accept: ".txt,.md,.markdown",
                multiple: true,
                onChange: (e) => files(e, false),
              }),
            ),
            h(
              "label",
              null,
              h("span", null, "上传图片"),
              h("input", {
                type: "file",
                accept: "image/png,image/jpeg,image/webp",
                multiple: true,
                onChange: (e) => files(e, true),
              }),
            ),
            h(
              "div",
              { className: "ppt-assets" },
              ...project.assets.map((a, i) =>
                h(
                  "div",
                  { key: a.id },
                  h("img", { src: a.dataUrl, alt: a.name }),
                  h("div", { className: "ppt-muted" }, a.name),
                  btn("移除", () =>
                    edit((p) => {
                      p.assets.splice(i, 1);
                      return p;
                    }),
                  ),
                ),
              ),
            ),
          ),
        );
      const outline =
        project &&
        h(
          "div",
          { className: "ppt-workbench" },
          h(
            "aside",
            { className: "ppt-stack" },
            ...project.slides.map((s, i) =>
              btn(
                `${String(i + 1).padStart(2, "0")}  ${s.title}`,
                () => setSelected(i),
                {
                  key: s.id,
                  className: `ppt-slide-button ${selected === i ? "active" : ""}`,
                },
              ),
            ),
            btn("+ 添加页面", () => {
              setSelected(project.slides.length);
              edit((p) => {
                p.slides.push({
                  id: uid(),
                  title: "新页面",
                  intent: "",
                  points: [],
                  sourceIds: [],
                  notes: "",
                  html: "",
                  css: "",
                  status: "outline",
                });
                p.outlineConfirmed = false;
                return p;
              });
            }),
          ),
          h(
            "section",
            { className: "ppt-card" },
            h("h2", null, "叙事大纲"),
            h(
              "p",
              { className: "ppt-muted", style: { marginBottom: 20 } },
              "确认每页要表达什么，视觉布局由 AI 自由设计。修改内容会使该页回到待设计状态。",
            ),
            slide
              ? h(
                  React.Fragment,
                  null,
                  field("页面标题", slide.title, (v) =>
                    editSlide((s) => (s.title = v)),
                  ),
                  field("这一页的核心结论", slide.intent, (v) =>
                    editSlide((s) => (s.intent = v)),
                  ),
                  field(
                    "内容要点（每行一条）",
                    slide.points.join("\n"),
                    (v) => editSlide((s) => (s.points = v.split("\n"))),
                    true,
                  ),
                  field(
                    "讲稿 / 备注",
                    slide.notes,
                    (v) => editSlide((s) => (s.notes = v), false),
                    true,
                  ),
                  h(
                    "div",
                    { className: "ppt-row" },
                    btn(
                      "上移",
                      () => {
                        edit((p) => {
                          [p.slides[selected - 1], p.slides[selected]] = [
                            p.slides[selected],
                            p.slides[selected - 1],
                          ];
                          p.outlineConfirmed = false;
                          return p;
                        });
                        setSelected(selected - 1);
                      },
                      { disabled: selected === 0 },
                    ),
                    btn(
                      "下移",
                      () => {
                        edit((p) => {
                          [p.slides[selected + 1], p.slides[selected]] = [
                            p.slides[selected],
                            p.slides[selected + 1],
                          ];
                          p.outlineConfirmed = false;
                          return p;
                        });
                        setSelected(selected + 1);
                      },
                      { disabled: selected === project.slides.length - 1 },
                    ),
                    btn(
                      "删除页面",
                      () => {
                        edit((p) => {
                          p.slides.splice(selected, 1);
                          p.outlineConfirmed = false;
                          return p;
                        });
                        setSelected(Math.max(0, selected - 1));
                      },
                      { className: "ppt-danger" },
                    ),
                  ),
                )
              : h(
                  "div",
                  { className: "ppt-empty" },
                  "先从材料准备大纲，或添加页面。",
                ),
          ),
          h(
            "aside",
            { className: "ppt-card ppt-inspector ppt-stack" },
            h("h3", null, project.outlineConfirmed ? "大纲已确认" : "等待确认"),
            h("p", { className: "ppt-muted" }, "先看代表页，再生成整套演示。"),
            btn(
              "确认大纲",
              () =>
                run(async () => {
                  if (dirty) throw new Error("请先保存大纲");
                  await act("confirm");
                  setTab("preview");
                  setNotice("大纲已确认，可以开始设计代表页。");
                }),
              {
                className: "primary",
                disabled:
                  busy ||
                  aiRunning ||
                  !project.slides.length ||
                  (project.outlineConfirmed &&
                    project.review?.sampleIds.length > 0),
              },
            ),
            btn("让 AI 整理大纲", () => run(() => taskFor("outline")), {
              disabled: busy || aiRunning || !aiAvailable,
            }),
            h("h3", null, "本页来源"),
            ...(slide?.sourceIds || []).map((id) =>
              h(
                "p",
                { key: id, className: "ppt-muted" },
                project.sources.find((s) => s.id === id)?.name || id,
              ),
            ),
          ),
        );
      const previewView =
        project &&
        h(
          "div",
          { className: "ppt-workbench" },
          h(
            "aside",
            { className: "ppt-stack" },
            ...project.slides.map((s, i) =>
              btn(
                `${i + 1} · ${s.title} ${s.status === "ready" ? "✓" : ""}`,
                () => setSelected(i),
                {
                  key: s.id,
                  className: `ppt-slide-button ${selected === i ? "active" : ""}`,
                },
              ),
            ),
          ),
          h(
            "section",
            { className: "ppt-stack" },
            h(Frame, { html: preview, title: slide?.title || "页面预览" }),
            h(
              "div",
              { className: "ppt-row" },
              h("h3", null, slide?.title || "暂无页面"),
              h(
                "span",
                { className: "ppt-badge" },
                `${project.slides.filter((s) => s.status === "ready").length} / ${project.slides.length} 页已就绪`,
              ),
            ),
            slide &&
              h(
                "div",
                { className: "ppt-card" },
                h("h3", null, "讲稿"),
                h(
                  "p",
                  { style: { whiteSpace: "pre-wrap" } },
                  slide.notes || "暂无讲稿",
                ),
              ),
          ),
          h(
            "aside",
            { className: "ppt-card ppt-stack ppt-inspector" },
            h("h3", null, "与 AI 协作"),
            h(
              "p",
              { className: "ppt-muted" },
              "先生成代表页并审阅视觉方向，再完成全套。单页修改只影响当前页。",
            ),
            btn("设计代表页", () => run(() => taskFor("sample")), {
              className: "primary",
              disabled:
                busy || aiRunning || !aiAvailable || !project.outlineConfirmed,
            }),
            h(
              "p",
              { className: "ppt-muted" },
              project.review?.approved
                ? "视觉方向已接受"
                : `请审阅代表页：${(project.review?.sampleIds || []).map((id) => project.slides.findIndex((s) => s.id === id) + 1).join("、") || "先确认大纲"}`,
            ),
            btn(
              "接受视觉方向",
              () =>
                run(async () => {
                  if (dirty) throw new Error("请先保存修改");
                  await act("approve-design");
                  setNotice("视觉方向已接受，可以生成剩余页面。");
                }),
              {
                disabled:
                  busy ||
                  aiRunning ||
                  project.review?.approved ||
                  !project.review?.sampleIds?.length ||
                  project.review.sampleIds.some(
                    (id) =>
                      project.slides.find((s) => s.id === id)?.status !==
                      "ready",
                  ),
              },
            ),
            btn("完成全部页面", () => run(() => taskFor("all")), {
              disabled:
                busy ||
                aiRunning ||
                !aiAvailable ||
                !project.review?.approved ||
                project.slides.every((s) => s.status === "ready"),
            }),
            btn("修改当前页", () => run(() => taskFor("page")), {
              disabled:
                busy ||
                aiRunning ||
                !aiAvailable ||
                !slide ||
                !project.outlineConfirmed ||
                !feedback.trim(),
            }),
            btn("刷新页面", () =>
              run(async () => {
                if (dirty) throw new Error("请先保存修改");
                setProject(await api("get", { id: project.id }));
              }),
            ),
            h("p", { className: "ppt-muted" }, "固定 16:9 画布 · 自由布局"),
          ),
        );
      const delivery =
        project &&
        h(
          "div",
          { className: "ppt-grid" },
          h(
            "section",
            { className: "ppt-card ppt-stack" },
            h("h2", null, "交付演示"),
            h(
              "p",
              { className: "ppt-muted" },
              "HTML 和 PDF 使用同一份页面内容。项目文件包含素材、图片和页面源码，可重新导入继续编辑。",
            ),
            btn(
              "检查页面",
              () =>
                run(async () => {
                  if (dirty) throw new Error("请先保存修改");
                  const result = await api("check", { id: project.id });
                  setNotice(
                    result.ok
                      ? "页面检查通过：未发现文字越界或图片缺失。"
                      : result.slides
                          .flatMap((s) =>
                            s.issues.map((issue) => s.title + "：" + issue),
                          )
                          .join("\n") || "尚无页面",
                  );
                }),
              { disabled: busy },
            ),
            ...["pdf", "html", "json"].map((format, i) =>
              btn(
                ["下载 PDF", "下载 HTML 演示", "下载可编辑项目"][i],
                () => run(() => download(format)),
                {
                  key: format,
                  className: i === 0 ? "primary" : "",
                  disabled:
                    busy ||
                    dirty ||
                    (format !== "json" &&
                      (!project.outlineConfirmed ||
                        !project.slides.length ||
                        project.slides.some((s) => s.status !== "ready"))),
                },
              ),
            ),
          ),
          h(
            "section",
            { className: "ppt-card ppt-stack" },
            h("h2", null, "修订历史"),
            h(
              "p",
              { className: "ppt-muted" },
              `当前修订 r${project.revision}。恢复会创建新修订，不删除历史。`,
            ),
            btn("加载修订记录", () =>
              run(async () =>
                setHistory(await api("history", { id: project.id })),
              ),
            ),
            ...history.map((r) =>
              btn(
                `恢复到 r${r}`,
                () =>
                  run(async () => {
                    if (dirty) throw new Error("请先保存修改");
                    await act("restore", { revision: r });
                    setSelected(0);
                    setHistory([]);
                    setNotice("已恢复，并创建新修订");
                  }),
                { key: r, disabled: busy || r === project.revision },
              ),
            ),
          ),
        );
      return h(
        "fieldset",
        {
          className: "ppt-app",
          disabled: busy,
          style: { border: 0, margin: 0, minWidth: 0 },
        },
        h("style", null, CSS),
        h(
          "header",
          { className: "ppt-top" },
          h(
            "div",
            null,
            h("div", { className: "ppt-muted" }, "DSH / CREATIVE WORKSPACE"),
            h("h1", null, "PPT Studio"),
            h("p", { className: "ppt-muted" }, "从想法到可交付的演示"),
          ),
          h(
            "div",
            { className: "ppt-row" },
            project &&
              h(
                "span",
                { className: "ppt-badge" },
                dirty ? "有未保存修改" : `已保存 · r${project.revision}`,
              ),
            dirty &&
              btn(
                "放弃本地修改",
                () =>
                  run(async () => {
                    if (!window.confirm("放弃未保存的修改并加载最新版本？"))
                      return;
                    setProject(await api("get", { id: project.id }));
                    setDirty(false);
                    setSelected(0);
                  }),
                { disabled: busy },
              ),
            project &&
              btn("保存修改", () => run(save), {
                className: "primary",
                disabled: busy || aiRunning || !dirty,
              }),
            btn(
              project ? "项目列表" : "新建项目",
              () =>
                run(async () => {
                  if (project) {
                    if (dirty) throw new Error("请先保存修改");
                    setProject(null);
                    setTask(null);
                    await refresh();
                  } else setCreating(true);
                }),
              { disabled: busy },
            ),
          ),
        ),
        error &&
          h("div", { role: "alert", className: "ppt-notice ppt-error" }, error),
        notice && h("div", { role: "status", className: "ppt-notice" }, notice),
        busy && h("p", { role: "status" }, "处理中…"),
        !project
          ? h(
              React.Fragment,
              null,
              creating &&
                h(
                  "section",
                  { className: "ppt-card", style: { marginBottom: 20 } },
                  h("h2", null, "新建演示"),
                  field("演示标题", title, setTitle),
                  field("粘贴需求或材料", content, setContent, true),
                  btn(
                    "创建项目",
                    () =>
                      run(async () => {
                        const p = await api("create", { title, content });
                        open(p);
                        setCreating(false);
                        setTitle("");
                        setContent("");
                      }),
                    { className: "primary", disabled: busy || !title.trim() },
                  ),
                ),
              h(
                "div",
                { className: "ppt-projects" },
                ...projects.map((p) =>
                  btn(
                    h(
                      React.Fragment,
                      null,
                      h("h2", null, p.title),
                      h(
                        "p",
                        { className: "ppt-muted" },
                        `${p.slideCount} 页 · r${p.revision}`,
                      ),
                    ),
                    () => run(async () => open(await api("get", { id: p.id }))),
                    { key: p.id },
                  ),
                ),
              ),
              !projects.length &&
                !creating &&
                h(
                  "div",
                  { className: "ppt-empty" },
                  "新建项目，粘贴你的想法或已有材料。",
                ),
              h(
                "label",
                { style: { marginTop: 24, maxWidth: 360 } },
                h("span", null, "导入项目 JSON"),
                h("input", {
                  type: "file",
                  accept: ".json",
                  onChange: (e) => {
                    const file = e.target.files[0];
                    e.target.value = "";
                    if (file)
                      run(async () => {
                        if (file.size > 25000000)
                          throw new Error("项目文件超过 25 MB");
                        open(
                          await api("import", {
                            project: JSON.parse(await file.text()),
                          }),
                        );
                      });
                  },
                }),
              ),
            )
          : h(
              React.Fragment,
              null,
              h("div", { className: "ppt-row" }, h("h2", null, project.title)),
              h(
                "nav",
                { className: "ppt-tabs" },
                ...["materials", "outline", "preview", "delivery"].map((t, i) =>
                  btn(
                    ["01 材料与目标", "02 大纲", "03 设计与预览", "04 交付"][i],
                    () => setTab(t),
                    { key: t, className: tab === t ? "active" : "" },
                  ),
                ),
              ),
              tab === "materials"
                ? h(
                    "fieldset",
                    {
                      disabled: !!aiRunning,
                      style: { border: 0, padding: 0, margin: 0, minWidth: 0 },
                    },
                    materials,
                  )
                : tab === "outline"
                  ? h(
                      "fieldset",
                      {
                        disabled: !!aiRunning,
                        style: {
                          border: 0,
                          padding: 0,
                          margin: 0,
                          minWidth: 0,
                        },
                      },
                      outline,
                    )
                  : tab === "preview"
                    ? previewView
                    : delivery,
              taskBox,
            ),
      );
    }
    return {
      inject: ["slots"],
      apply(ctx) {
        ctx.slots.inject("sidebar.panellist", () =>
          ctx.slots.register(
            {
              name: "sidebar.panellist",
              id: "ppt-studio",
              order: 50,
              label: "PPT Studio",
            },
            () => h("span", { "aria-hidden": true }, "▤"),
          ),
        );
        ctx.slots.inject("main", () =>
          ctx.slots.register({ name: "main", key: "ppt-studio" }, () =>
            h(Panel),
          ),
        );
      },
    };
  },
});
