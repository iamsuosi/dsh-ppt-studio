import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ProjectStore,
  createProject,
  validateProject,
} from "../lib/project.js";
import { studioAction, studioHttp } from "../lib/studio-service.js";
import { renderSlice, renderPresentation } from "../lib/web-renderer.js";
import { buildStudioTools } from "../lib/studio-tools.js";
function setup(t) {
  const dir = mkdtempSync(join(tmpdir(), "ppt-project-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return new ProjectStore(dir);
}
test("material → outline → approval → independent page updates → revision restore", async (t) => {
  const store = setup(t);
  let p = await studioAction(store, "create", {
    title: "项目发布",
    content: "## 问题\n- 时间紧\n## 方案\n- 每页独立",
  });
  p = await studioAction(store, "prepare", {
    id: p.id,
    expectedRevision: p.revision,
  });
  assert.equal(p.slides.length, 2);
  assert.equal(p.slides[0].sourceIds[0], "source-1");
  await assert.rejects(
    studioAction(store, "slide", {
      id: p.id,
      slideId: p.slides[0].id,
      expectedRevision: p.revision,
      html: "<h1>测试</h1>",
    }),
    /确认大纲/,
  );
  p = await studioAction(store, "confirm", {
    id: p.id,
    expectedRevision: p.revision,
  });
  const before = structuredClone(p);
  p = await studioAction(store, "slide", {
    id: p.id,
    slideId: p.slides[0].id,
    expectedRevision: p.revision,
    html: "<h1>测试</h1>",
    css: "h1{font-size:80px}",
  });
  assert.deepEqual(p.slides[1], before.slides[1]);
  await assert.rejects(
    studioAction(store, "save", { project: p, expectedRevision: 1 }),
    /更新/,
  );
  assert.throws(() => renderPresentation(p), /完成所有页面/);
  p = await studioAction(store, "restore", {
    id: p.id,
    revision: before.revision,
    expectedRevision: p.revision,
  });
  assert.equal(p.slides[0].status, "outline");
  assert.equal(p.revision, 5);
  assert.deepEqual(store.history(p.id), [5, 4, 3, 2, 1]);
  assert.equal(new ProjectStore(store.root).get(p.id).revision, 5);
});
test("reject traversal, duplicate slide IDs, invalid source references and image payloads", async (t) => {
  const store = setup(t);
  assert.throws(() => store.get("../escape"), /无效/);
  let p = store.save(createProject({ title: "验证", content: "## A\n内容" }));
  p = await studioAction(store, "prepare", {
    id: p.id,
    expectedRevision: p.revision,
  });
  const copy = structuredClone(p);
  copy.slides.push(copy.slides[0]);
  assert.throws(() => validateProject(copy), /重复/);
  p.slides[0].sourceIds = ["unknown"];
  assert.throws(() => validateProject(p), /不存在/);
  p.slides[0].sourceIds = [];
  p.assets = [
    {
      id: "bad",
      name: "x",
      dataUrl: 'data:image/svg+xml,<svg onload="alert(1)"/>',
    },
  ];
  assert.throws(() => validateProject(p), /图片/);
});
test("page sanitization retains SVG and typography, rejects active content and isolates CSS", () => {
  const p = createProject({ title: "安全" });
  const s = {
    id: "one",
    title: "页",
    html: '<script>alert(1)</script><img src="https://example.com/x" onerror="alert(1)"><svg viewBox="0 0 100 100" fill="none" stroke="green"><circle cx="50" cy="50" r="10" fill="red"/></svg><iframe src="https://example.com"></iframe>',
    css: "h1{font-size:80px}",
    status: "ready",
  };
  const html = renderSlice(p, s);
  assert.doesNotMatch(html, /<script|onerror|<iframe/);
  assert.match(html, /viewBox="0 0 100 100"/);
  assert.match(html, /<svg[^>]*fill="none"[^>]*stroke="green"/);
  assert.match(html, /default-src 'none'/);
  p.slides = [s];
  p.outlineConfirmed = true;
  assert.match(renderPresentation(p), /sandbox=""/);
});
test("JSON delivery/import preserves editable sources and creates a new project identity", async (t) => {
  const store = setup(t);
  const p = store.save(createProject({ title: "可编辑", content: "原始资料" }));
  const imported = await studioAction(store, "import", { project: p });
  assert.notEqual(imported.id, p.id);
  assert.deepEqual(imported.sources, p.sources);
  const response = await studioHttp(store)(
    new Request("http://localhost/api/ppt-studio", {
      method: "POST",
      body: JSON.stringify({
        action: "export",
        args: { id: p.id, format: "json" },
      }),
    }),
  );
  assert.equal(response.status, 200);
  assert.equal((await response.json()).title, p.title);
});
test("registered model tool and UI use the same store", async (t) => {
  const store = setup(t),
    tool = buildStudioTools(store)[0];
  const result = await tool.execute(
    { action: "create", args: { title: "Agent project" } },
    {},
  );
  assert.equal(store.list()[0].id, result.id);
  assert.equal(tool.parameters.type, "object");
});

test("agent image manifest omits base64 and round-trips assets through outline save", async (t) => {
  const store = setup(t),
    tool = buildStudioTools(store)[0];
  const p = createProject({ title: "图片项目" });
  p.assets = [
    {
      id: "image-1",
      name: "pixel.png",
      dataUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXWQAAAAASUVORK5CYII=",
    },
  ];
  store.save(p);
  const result = await tool.execute({ action: "get", args: { id: p.id } }, {});
  assert.equal(result.assets[0].dataUrl, undefined);
  assert.match(result.assets[0].filePath, /image-1\.png$/);
  result.brief.goal = "说明一个清晰的观点";
  await tool.execute(
    { action: "save", args: { project: result, expectedRevision: 1 } },
    {},
  );
  assert.equal(store.get(p.id).assets[0].dataUrl, p.assets[0].dataUrl);
});

test("invalid project dates do not poison the project listing", (t) => {
  const store = setup(t),
    p = createProject({ title: "日期" });
  p.updatedAt = 42;
  assert.throws(() => store.save(p), /updatedAt/);
  assert.deepEqual(store.list(), []);
});

test("changing source material invalidates affected pages and requires outline review", async (t) => {
  const store = setup(t);
  let p = store.save(
    createProject({ title: "来源更新", content: "## 原材料\n原始数据" }),
  );
  p = await studioAction(store, "prepare", {
    id: p.id,
    expectedRevision: p.revision,
  });
  p = await studioAction(store, "confirm", {
    id: p.id,
    expectedRevision: p.revision,
  });
  p = await studioAction(store, "slide", {
    id: p.id,
    slideId: p.slides[0].id,
    expectedRevision: p.revision,
    html: "<h1>原始数据</h1>",
  });
  p.sources[0].text = "## 新材料\n新数据";
  p = await studioAction(store, "save", {
    project: p,
    expectedRevision: p.revision,
  });
  assert.equal(p.outlineConfirmed, false);
  assert.equal(p.slides[0].status, "outline");
  assert.throws(() => renderPresentation(p), /确认最新大纲/);
});
