// Opt-in: this test makes real model calls using DSH's configured default model.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";
if (process.env.DSH_LIVE_TEST !== "1" || !process.env.DSH_TEST_URL)
  throw Error(
    "Set DSH_LIVE_TEST=1 and the private DSH_TEST_URL to run live-model acceptance.",
  );
const output = process.env.DSH_TEST_OUTPUT || "/tmp/ppt-studio-live";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.DSH_PPT_CHROMIUM_PATH || "/usr/bin/chromium",
  args: process.env.DSH_PPT_NO_SANDBOX === "1" ? ["--no-sandbox"] : [],
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 1100 },
  acceptDownloads: true,
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function api(action, args = {}) {
  return page.evaluate(
    async ({ action, args }) => {
      const r = await fetch("/api/ppt-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, args }),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error);
      return result;
    },
    { action, args },
  );
}
let id;
async function waitTask(mode) {
  let last = "";
  for (let i = 0; i < 120; i++) {
    const { task } = await api("task-status", { id });
    if (task?.mode === mode) {
      const status = task.status + ": " + task.progress;
      if (status !== last) {
        console.log(status);
        last = status;
      }
      if (["failed", "canceled", "interrupted"].includes(task.status))
        throw Error(task.error || task.status);
      if (task.status === "completed") return task;
    }
    await page.waitForTimeout(3000);
  }
  throw Error("Timed out waiting for " + mode);
}
try {
  await page.goto(process.env.DSH_TEST_URL);
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "PPT Studio", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  const title = `工作台直连验收 ${Date.now()}`;
  await page.getByLabel("演示标题", { exact: true }).fill(title);
  await page
    .getByLabel("粘贴需求或材料", { exact: true })
    .fill(
      "请制作恰好三页演示，面向产品团队，采用简洁深色背景和绿色点缀。\n## 目标\nPPT Studio 帮助团队从想法制作可交付的演示。\n## 过程\n先整理材料和确认大纲；再审阅代表页并生成全套。\n## 交付\n逐页检查，导出 PDF、HTML 和可编辑项目。不要编造数据、客户或案例。",
    );
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  id = (await api("list")).find((p) => p.title === title).id;
  writeFileSync(join(output, "project-id.json"), JSON.stringify({ id }));
  await page.getByRole("button", { name: "让 AI 规划", exact: true }).click();
  await waitTask("outline");
  let p = await api("get", { id });
  assert.equal(p.slides.length, 3);
  assert.equal(p.outlineConfirmed, false);
  assert.equal(p.review.approved, false);
  await page.getByRole("button", { name: "02 大纲", exact: true }).click();
  await page.getByRole("button", { name: "确认大纲", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "完成全部页面", exact: true })
      .isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "设计代表页", exact: true }).click();
  await page.reload();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "PPT Studio", exact: true }).click();
  await page.getByRole("heading", { name: title, exact: true }).click();
  await page
    .getByRole("button", { name: "03 设计与预览", exact: true })
    .click();
  await waitTask("sample");
  p = await api("get", { id });
  assert.equal(p.slides.filter((s) => s.status === "ready").length, 2);
  assert.equal(p.review.approved, false);
  assert.equal(
    await page
      .getByRole("button", { name: "完成全部页面", exact: true })
      .isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "接受视觉方向", exact: true }).click();
  await page.getByRole("button", { name: "完成全部页面", exact: true }).click();
  await waitTask("all");
  p = await api("get", { id });
  assert.ok(p.slides.every((s) => s.status === "ready"));
  const before = structuredClone(p);
  await page.getByRole("button", { name: /^3 · / }).click();
  await page
    .getByLabel("任务补充 / 修改意见")
    .fill(
      "仅在这一页讲稿末尾添加“工作台单页修改验收通过”。保留原有 HTML、CSS、版式和其他页面，完成后停止。",
    );
  await page.getByRole("button", { name: "修改当前页", exact: true }).click();
  await waitTask("page");
  p = await api("get", { id });
  assert.deepEqual(p.slides.slice(0, 2), before.slides.slice(0, 2));
  assert.match(p.slides[2].notes, /工作台单页修改验收通过/);
  await page.screenshot({
    path: join(output, "workbench.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "04 交付", exact: true }).click();
  const check = await api("check", { id });
  console.log(JSON.stringify({ check }));
  for (const [name, ext] of [
    ["下载 PDF", "pdf"],
    ["下载 HTML 演示", "html"],
    ["下载可编辑项目", "json"],
  ]) {
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    const download = await pending;
    await download.saveAs(join(output, `presentation.${ext}`));
    assert.equal(await download.failure(), null);
  }
  assert.deepEqual(errors, []);
  writeFileSync(
    join(output, "result.json"),
    JSON.stringify(
      {
        ok: true,
        id,
        revision: p.revision,
        checks: [
          "outline",
          "manual approval",
          "representative slides",
          "refresh recovery",
          "visual approval",
          "full deck",
          "scoped revision",
          "exports",
        ],
        layoutCheck: check,
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log("PASS: live workbench flow completed");
} catch (error) {
  await page.screenshot({ path: join(output, "failure.png"), fullPage: true });
  throw error;
} finally {
  await browser.close();
}
