import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ProjectStore, createProject } from "../lib/project.js";
import { studioAction } from "../lib/studio-service.js";
import { StudioTasks } from "../lib/studio-tasks.js";

function fixture(t, behavior) {
  const root = mkdtempSync(join(tmpdir(), "ppt-tasks-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const store = new ProjectStore(root);
  let starts = 0;
  const context = {
    agentDefaultModel: {
      currentSelection: () => ({ provider: "fixture", model: "fixture" }),
    },
    agents: {
      create: async (options) => {
        const listeners = {};
        let tool,
          done = Promise.resolve(),
          finish;
        options.setup({
          tools: { restrict: () => {}, register: (t) => (tool = t) },
          on: (event, fn) => (listeners[event] = fn),
        });
        return {
          agent: {
            followup: (message) => {
              done = new Promise((resolve) => (finish = resolve));
              starts++;
              Promise.resolve()
                .then(() =>
                  behavior({
                    tool,
                    store,
                    listeners,
                    message,
                    attempt: starts,
                  }),
                )
                .catch((error) => listeners["agent/error"]?.({ error }))
                .finally(() => finish());
            },
            whenIdle: () => done,
            cancel: () => finish?.(),
          },
          dispose: async () => {},
        };
      },
    },
  };
  const tasks = new StudioTasks(store, () => context);
  t.after(() => tasks.dispose());
  return { store, tasks };
}
async function settled(tasks, id) {
  for (let i = 0; i < 100; i++) {
    const t = tasks.get(id);
    if (!["queued", "running", "canceling"].includes(t.status)) return t;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw Error("fixture did not settle");
}
async function planned(store) {
  let p = store.save(
    createProject({
      title: "三页测试",
      content: "## 第一页\n内容 A\n## 第二页\n内容 B\n## 第三页\n内容 C",
    }),
  );
  p = await studioAction(store, "prepare", {
    id: p.id,
    expectedRevision: p.revision,
  });
  return studioAction(store, "confirm", {
    id: p.id,
    expectedRevision: p.revision,
  });
}
const writeSlide = async (tool, p, id) =>
  tool.execute(
    {
      action: "slide",
      args: {
        id: p.id,
        slideId: id,
        expectedRevision: p.revision,
        html: `<h1>${id}</h1>`,
        css: "h1{font-size:80px}",
        notes: "已修改",
      },
    },
    {},
  );

test("visual review gates full generation and scope protects other pages", async (t) => {
  const { store, tasks } = fixture(t, async ({ tool }) => {
    let p = store.get(project.id);
    await assert.rejects(
      tool.execute(
        { action: "confirm", args: { id: p.id, expectedRevision: p.revision } },
        {},
      ),
      /不允许/,
    );
    await assert.rejects(writeSlide(tool, p, p.slides[2].id), /范围外/);
    for (const id of p.review.sampleIds) p = await writeSlide(tool, p, id);
  });
  let project = await planned(store);
  assert.throws(
    () =>
      tasks.start({
        id: project.id,
        mode: "all",
        expectedRevision: project.revision,
      }),
    /接受视觉方向/,
  );
  await assert.rejects(
    studioAction(store, "approve-design", {
      id: project.id,
      expectedRevision: project.revision,
    }),
    /完成代表页/,
  );
  tasks.start({
    id: project.id,
    mode: "sample",
    expectedRevision: project.revision,
  });
  assert.equal((await settled(tasks, project.id)).status, "completed");
  project = store.get(project.id);
  assert.equal(project.slides[2].status, "outline");
  project = await studioAction(store, "approve-design", {
    id: project.id,
    expectedRevision: project.revision,
  });
  assert.equal(project.review.approved, true);
  project = await studioAction(store, "slide", {
    id: project.id,
    slideId: project.slides[0].id,
    expectedRevision: project.revision,
    html: "<h1>换个视觉</h1>",
  });
  assert.equal(project.review.approved, false);
  assert.throws(
    () =>
      tasks.start({
        id: project.id,
        mode: "all",
        expectedRevision: project.revision,
      }),
    /接受视觉方向/,
  );
});

test("task locks writes, rejects duplicate starts, cancels and releases the project", async (t) => {
  const { store, tasks } = fixture(t, () => new Promise(() => {}));
  const p = await planned(store);
  const task = tasks.start({
    id: p.id,
    mode: "sample",
    expectedRevision: p.revision,
  });
  assert.throws(
    () =>
      tasks.start({ id: p.id, mode: "sample", expectedRevision: p.revision }),
    /正在运行/,
  );
  await assert.rejects(
    studioAction(store, "save", { project: p, expectedRevision: p.revision }),
    /正在运行/,
  );
  await new Promise((r) => setTimeout(r, 5));
  await tasks.handle("task-cancel", { id: p.id, taskId: task.id });
  assert.equal((await settled(tasks, p.id)).status, "canceled");
  assert.equal(
    store.save(store.get(p.id), p.revision).revision,
    p.revision + 1,
  );
});

test("model failure is visible, retry uses latest revision, and successful completion is persisted", async (t) => {
  let project;
  const { store, tasks } = fixture(t, async ({ tool, attempt }) => {
    if (attempt === 1) throw Error("provider unavailable");
    let p = store.get(project.id);
    for (const id of p.review.sampleIds) p = await writeSlide(tool, p, id);
  });
  project = await planned(store);
  const first = tasks.start({
    id: project.id,
    mode: "sample",
    expectedRevision: project.revision,
  });
  const failed = await settled(tasks, project.id);
  assert.equal(failed.status, "failed");
  assert.match(failed.error, /provider unavailable/);
  await tasks.handle("task-retry", {
    id: project.id,
    taskId: first.id,
    expectedRevision: store.get(project.id).revision,
  });
  assert.equal((await settled(tasks, project.id)).status, "completed");
  assert.equal(
    new StudioTasks(store, () => undefined).get(project.id).status,
    "completed",
  );
});

test("unfinished task after restart becomes interrupted, never silently replays a model request", (t) => {
  const { store, tasks } = fixture(t, () => {}),
    p = store.save(createProject({ title: "恢复测试" }));
  writeFileSync(
    join(store.path(p.id), "task.json"),
    JSON.stringify({
      projectId: p.id,
      status: "running",
      id: "old",
      mode: "outline",
      messages: [],
    }),
  );
  const status = tasks.get(p.id);
  assert.equal(status.status, "interrupted");
  assert.match(status.error, /重启/);
});

test("outline agent cannot confirm review, mutate inputs, or touch a different project", async (t) => {
  let project;
  const { store, tasks } = fixture(t, async ({ tool }) => {
    const p = await tool.execute(
      { action: "get", args: { id: project.id } },
      {},
    );
    await assert.rejects(
      tool.execute({ action: "get", args: { id: "other-project" } }, {}),
      /当前项目/,
    );
    const corrupted = structuredClone(p);
    corrupted.sources[0].text = "modified";
    await assert.rejects(
      tool.execute(
        {
          action: "save",
          args: { project: corrupted, expectedRevision: p.revision },
        },
        {},
      ),
      /原始材料/,
    );
    p.slides = [
      {
        id: "planned",
        title: "明确结论",
        intent: "传达关键点",
        points: ["来自原文"],
        sourceIds: [p.sources[0].id],
        notes: "",
        html: "",
        css: "",
        status: "outline",
      },
    ];
    p.outlineConfirmed = true;
    await tool.execute(
      { action: "save", args: { project: p, expectedRevision: p.revision } },
      {},
    );
  });
  project = store.save(
    createProject({ title: "规划测试", content: "原始材料" }),
  );
  tasks.start({
    id: project.id,
    mode: "outline",
    expectedRevision: project.revision,
  });
  assert.equal((await settled(tasks, project.id)).status, "completed");
  assert.equal(store.get(project.id).outlineConfirmed, false);
});

test("uploaded images are admitted through DSH and sent as image content, not base64 text", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "ppt-images-")),
    store = new ProjectStore(root);
  let sent, admitted;
  const p = createProject({ title: "图片", content: "使用给出的产品照片" });
  p.assets = [
    {
      id: "photo",
      name: "product.png",
      dataUrl: "data:image/png;base64,aGVsbG8=",
    },
  ];
  store.save(p);
  const context = {
    attachments: {
      admitPromptContent: async (parts) => {
        admitted = parts;
        return parts.map((part) =>
          part.type === "image"
            ? { type: "image", attachment: { id: "test-reference" } }
            : part,
        );
      },
    },
    agentDefaultModel: {
      currentSelection: () => ({ provider: "fake", model: "fake" }),
    },
    agents: {
      create: async () => ({
        agent: {
          followup: (message) => (sent = message),
          whenIdle: async () => {},
          cancel: () => {},
        },
        dispose: async () => {},
      }),
    },
  };
  const tasks = new StudioTasks(store, () => context);
  t.after(async () => {
    await tasks.dispose();
    rmSync(root, { recursive: true, force: true });
  });
  tasks.start({ id: p.id, mode: "outline", expectedRevision: 1 });
  await settled(tasks, p.id);
  assert.equal(admitted.find((p) => p.type === "image").mediaType, "image/png");
  assert.equal(admitted.find((p) => p.type === "image").data, "aGVsbG8=");
  assert.equal(
    sent.content.find((p) => p.type === "image").attachment.id,
    "test-reference",
  );
  assert.ok(!JSON.stringify(sent).includes("aGVsbG8="));
});

test("cancel during slow session creation never submits a prompt and releases lock", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "ppt-cancel-create-")),
    store = new ProjectStore(root);
  const p = store.save(createProject({ title: "取消启动" }));
  let release,
    submitted = false,
    disposed = false;
  const tasks = new StudioTasks(store, () => ({
    agentDefaultModel: {
      currentSelection: () => ({ provider: "fake", model: "fake" }),
    },
    agents: {
      create: () =>
        new Promise(
          (resolve) =>
            (release = () =>
              resolve({
                agent: {
                  followup: () => (submitted = true),
                  whenIdle: async () => {},
                  cancel: () => {},
                },
                dispose: async () => {
                  disposed = true;
                },
              })),
        ),
    },
  }));
  t.after(async () => {
    await tasks.dispose();
    rmSync(root, { recursive: true, force: true });
  });
  const task = tasks.start({ id: p.id, mode: "outline", expectedRevision: 1 });
  await tasks.handle("task-cancel", { id: p.id, taskId: task.id });
  release();
  assert.equal((await settled(tasks, p.id)).status, "canceled");
  assert.equal(submitted, false);
  assert.equal(disposed, true);
  assert.doesNotThrow(() =>
    store.save(store.get(p.id), store.get(p.id).revision),
  );
});
