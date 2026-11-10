// Real DSH host + deterministic page content. This does not exercise a model.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
const url = process.env.DSH_TEST_URL;
if (!url)
  throw new Error(
    "Set DSH_TEST_URL to the authenticated DSH Web URL (keep it out of logs).",
  );
const output = process.env.DSH_TEST_OUTPUT || "/tmp/ppt-studio-e2e";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.DSH_PPT_CHROMIUM_PATH || "/usr/bin/chromium",
  args: process.env.DSH_PPT_NO_SANDBOX === "1" ? ["--no-sandbox"] : [],
});
try {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1050 },
    acceptDownloads: true,
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForTimeout(1800);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "PPT Studio", exact: true }).click();
  await page.getByRole("button", { name: "新建项目", exact: true }).click();
  const title = `产品发布演示 ${Date.now()}`;
  await page.getByLabel("演示标题", { exact: true }).fill(title);
  await page
    .getByLabel("粘贴需求或材料", { exact: true })
    .fill(
      "## 从想法到交付\n- 自由设计每页视觉\n- PDF 保持视觉一致\n## 工作流程\n- 整理材料与大纲\n- 逐页生成并审阅\n- 交付 PDF 和 HTML",
    );
  await page.getByRole("button", { name: "创建项目", exact: true }).click();
  await page
    .getByRole("button", { name: "从材料提取大纲", exact: true })
    .click();
  await page.getByLabel("这一页的核心结论").fill("让内容和视觉自由表达");
  await page.getByRole("button", { name: "保存修改", exact: true }).click();
  await page.getByRole("button", { name: "确认大纲", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "完成全部页面", exact: true })
      .isDisabled(),
    true,
  );
  async function api(action, args = {}) {
    return page.evaluate(
      async ({ action, args }) => {
        const r = await fetch("/api/ppt-studio", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action, args }),
        });
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      },
      { action, args },
    );
  }
  const unauthenticated = await browser.newContext();
  const rejection = await unauthenticated.request.post(
    new URL("/api/ppt-studio", url).href,
    { data: { action: "list", args: {} } },
  );
  assert.equal(rejection.status(), 401);
  await unauthenticated.close();
  const list = await api("list");
  let project = await api("get", {
    id: list.find((p) => p.title === title).id,
  });
  assert.equal(project.slides.length, 2);
  assert.equal(project.outlineConfirmed, true);
  for (let i = 0; i < project.slides.length; i++) {
    const html =
      i === 0
        ? '<main><div class="eyebrow">PPT STUDIO / 01</div><h1>从想法<br>到交付。</h1><p>自由表达每一页，让创意成为可交付的演示。</p><svg viewBox="0 0 400 400" width="400" height="400"><circle cx="200" cy="200" r="160" fill="#bcff93"/><circle cx="200" cy="200" r="95" fill="#182b3b"/><path d="M130 200 L190 250 L280 140" fill="none" stroke="#bcff93" stroke-width="18"/></svg><footer>AI 自由设计 · HTML / CSS / SVG</footer></main>'
        : '<main><div class="eyebrow">THE WORKFLOW / 02</div><h1>内容先行，逐页打磨。</h1><div class="steps"><article><b>01</b><h2>整理材料</h2><p>让原文与来源保留下来</p></article><article><b>02</b><h2>设计页面</h2><p>以大纲为起点自由表达</p></article><article><b>03</b><h2>交付演示</h2><p>同一份内容导出 HTML 与 PDF</p></article></div><footer>从材料到最终演示的一次完整验证</footer></main>';
    const css =
      "body{background:#182b3b;color:#f4f1e9}main{padding:64px 80px;height:720px;position:relative}.eyebrow{color:#bcff93;font-size:16px;letter-spacing:3px}h1{font-size:76px;line-height:1.12;letter-spacing:-3px;margin:42px 0 24px}p{font-size:22px;color:#bbc8cd}svg{position:absolute;right:80px;top:140px}footer{position:absolute;bottom:46px;font-size:16px;color:#a4b4bb}.steps{display:flex;gap:24px;margin-top:60px}.steps article{background:#243e4e;width:340px;padding:28px;border-radius:14px}.steps b{font-size:40px;color:#bcff93}.steps h2{font-size:26px}.steps p{font-size:18px}";
    project = await api("slide", {
      id: project.id,
      slideId: project.slides[i].id,
      expectedRevision: project.revision,
      html,
      css,
      notes: "这是一页用于验证渲染和导出的测试内容。",
    });
  }
  const faulty = structuredClone(project);
  faulty.slides[0].html =
    '<h1 style="position:absolute;left:1300px">超出画布</h1><img src="asset:missing" alt="缺失素材">';
  const importedFaulty = await api("import", { project: faulty });
  const inspection = await api("check", { id: importedFaulty.id });
  assert.equal(inspection.ok, false);
  assert.ok(
    inspection.slides[0].issues.some((issue) => issue.includes("图片无法显示")),
  );
  assert.ok(
    inspection.slides[0].issues.some((issue) => issue.includes("文字超出画布")),
  );
  await page.getByRole("button", { name: "刷新页面", exact: true }).click();
  await page.getByText("2 / 2 页已就绪", { exact: true }).waitFor();
  await page.getByRole("button", { name: /^1 · 从想法到交付/ }).click();
  await page.locator(".ppt-preview iframe").waitFor();
  await page
    .frameLocator(".ppt-preview iframe")
    .getByRole("heading", { name: "从想法 到交付。" })
    .waitFor();
  await page.screenshot({
    path: join(output, "workbench.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "接受视觉方向", exact: true }).click();
  await page.getByRole("button", { name: "04 交付", exact: true }).click();
  await page.getByRole("button", { name: "检查页面", exact: true }).click();
  await page
    .getByText("页面检查通过：未发现文字越界或图片缺失。", { exact: true })
    .waitFor();

  for (const [name, file] of [
    ["下载 PDF", "presentation.pdf"],
    ["下载 HTML 演示", "presentation.html"],
    ["下载可编辑项目", "project.json"],
  ]) {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    const d = await download;
    await d.saveAs(join(output, file));
    assert.equal(await d.failure(), null);
  }
  await page.getByRole("button", { name: "加载修订记录", exact: true }).click();
  await page.getByRole("button", { name: "恢复到 r1", exact: true }).click();
  await page.getByText("已恢复，并创建新修订", { exact: true }).waitFor();
  assert.equal((await api("get", { id: project.id })).slides.length, 0);
  await page.getByRole("button", { name: "项目列表", exact: true }).click();
  await page
    .getByLabel("导入项目 JSON")
    .setInputFiles(join(output, "project.json"));
  await page
    .getByRole("button", { name: "03 设计与预览", exact: true })
    .click();
  await page.getByText("2 / 2 页已就绪", { exact: true }).waitFor();
  await page.reload();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "PPT Studio", exact: true }).click();
  await page
    .getByRole("heading", { name: title, exact: true })
    .first()
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      ok: true,
      output,
      checks: [
        "create",
        "outline edit/save",
        "confirmation",
        "visual approval gate",
        "page writes",
        "preview",
        "PDF/HTML/project downloads",
        "restore",
        "import",
        "reload persistence",
      ],
      pageErrors: errors,
    }),
  );
} finally {
  await browser.close();
}
