import sanitizeHtml from "sanitize-html";
import { chromium } from "playwright-core";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Project, Slice } from "./project.js";
import { StudioError } from "./project.js";

export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function renderSlice(p: Project, slide: Slice): string {
  let markup = slide.html;
  for (const asset of p.assets)
    markup = markup.split(`asset:${asset.id}`).join(asset.dataUrl);
  const safe = sanitizeHtml(markup, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "style",
      "img",
      "svg",
      "g",
      "path",
      "rect",
      "circle",
      "ellipse",
      "line",
      "polyline",
      "polygon",
      "text",
      "tspan",
      "defs",
      "linearGradient",
      "radialGradient",
      "stop",
      "clipPath",
      "use",
    ],
    allowedAttributes: {
      "*": ["class", "id", "style", "title", "role", "aria-label"],
      img: ["src", "alt", "width", "height"],
      svg: ["viewBox", "width", "height", "xmlns", "fill", "stroke", "stroke-width", "opacity", "preserveAspectRatio"],
      ...Object.fromEntries(
        [
          "g",
          "path",
          "rect",
          "circle",
          "ellipse",
          "line",
          "polyline",
          "polygon",
          "text",
          "tspan",
          "defs",
          "linearGradient",
          "radialGradient",
          "stop",
          "clipPath",
          "use",
        ].map((tag) => [
          tag,
          [
            "id",
            "class",
            "style",
            "d",
            "x",
            "y",
            "x1",
            "x2",
            "y1",
            "y2",
            "cx",
            "cy",
            "r",
            "rx",
            "ry",
            "width",
            "height",
            "fill",
            "stroke",
            "stroke-width",
            "stroke-linecap",
            "opacity",
            "transform",
            "points",
            "offset",
            "stop-color",
            "stop-opacity",
            "gradientUnits",
            "gradientTransform",
            "clip-path",
            "font-size",
            "font-family",
            "font-weight",
            "text-anchor",
            "dominant-baseline",
            "href",
          ],
        ]),
      ),
    },
    allowedSchemes: ["data"],
    allowedSchemesByTag: { img: ["data"] },
    allowProtocolRelative: false,
    allowVulnerableTags: true,
    parser: { lowerCaseTags: false, lowerCaseAttributeNames: false },
  });
  let cssSource = slide.css;
  for (const asset of p.assets)
    cssSource = cssSource.split(`asset:${asset.id}`).join(asset.dataUrl);
  const css = cssSource.replace(/<\/style/gi, "<\\/style");
  return `<!doctype html><html lang="${escapeHtml(p.brief.language)}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'"><style>*{box-sizing:border-box}html,body{margin:0;width:1280px;height:720px;overflow:hidden}body{font-family:Arial,'Noto Sans CJK SC',sans-serif;background:#fff;color:#17212f}*{animation:none!important;transition:none!important}${css}</style></head><body>${safe}</body></html>`;
}
export function renderPresentation(p: Project): string {
  if (!p.outlineConfirmed) throw new StudioError("请先确认最新大纲，再导出");
  if (!p.slides.length || p.slides.some((s) => s.status !== "ready"))
    throw new StudioError("请先完成所有页面，再导出");
  return `<!doctype html><html lang="${escapeHtml(p.brief.language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(p.title)}</title><style>@page{size:1280px 720px;margin:0}*{box-sizing:border-box}body{margin:0;background:#161b24}.page{width:1280px;height:720px;margin:24px auto;break-after:page;overflow:hidden}iframe{border:0;width:1280px;height:720px;display:block}@media print{body{background:white}.page{margin:0}.page:last-child{break-after:auto}}</style></head><body>${p.slides.map((s) => `<section class="page"><iframe sandbox="" title="${escapeHtml(s.title)}" srcdoc="${escapeHtml(renderSlice(p, s))}"></iframe></section>`).join("")}</body></html>`;
}
export async function exportProject(
  p: Project,
  dir: string,
  format: "html" | "pdf" | "json",
) {
  const path = join(dir, `presentation-r${p.revision}.${format}`);
  if (format === "json") {
    writeFileSync(path, JSON.stringify(p, null, 2));
    return path;
  }
  const html = renderPresentation(p);
  if (format === "html") {
    writeFileSync(path, html);
    return path;
  }
  const executablePath =
    process.env.DSH_PPT_CHROMIUM_PATH ||
    [
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/google-chrome",
    ].find(existsSync);
  if (!executablePath)
    throw new StudioError("未找到 Chromium，请设置 DSH_PPT_CHROMIUM_PATH", 503);
  const browser = await chromium.launch({
    executablePath,
    args: process.env.DSH_PPT_NO_SANDBOX === "1" ? ["--no-sandbox"] : [],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    await context.route("**/*", (route) => route.abort());
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await Promise.all(
      page.frames().map((frame) =>
        frame.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            Array.from(document.images).map((img) =>
              img.decode().catch(() => {}),
            ),
          );
        }),
      ),
    );
    await page.pdf({
      path,
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: false,
    });
    return path;
  } finally {
    await browser.close();
  }
}

/** Advisory geometry checks; decorative overflow may be intentional. */
export async function inspectProject(p: Project) {
  const executablePath =
    process.env.DSH_PPT_CHROMIUM_PATH ||
    [
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/usr/bin/google-chrome",
    ].find(existsSync);
  if (!executablePath)
    throw new StudioError("未找到 Chromium，请设置 DSH_PPT_CHROMIUM_PATH", 503);
  const browser = await chromium.launch({
    executablePath,
    args: process.env.DSH_PPT_NO_SANDBOX === "1" ? ["--no-sandbox"] : [],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    await context.route("**/*", (route) => route.abort());
    const page = await context.newPage(),
      results = [];
    for (const slide of p.slides) {
      if (slide.status !== "ready") {
        results.push({
          slideId: slide.id,
          title: slide.title,
          issues: ["页面尚未设计"],
        });
        continue;
      }
      await page.setContent(renderSlice(p, slide), { waitUntil: "load" });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          Array.from(document.images).map((img) =>
            img.decode().catch(() => {}),
          ),
        );
      });
      const issues = await page.evaluate(() => {
        const issues: string[] = [];
        for (const img of document.images)
          if (!img.complete || !img.naturalWidth)
            issues.push(`图片无法显示：${img.alt || "未命名图片"}`);
        for (const node of document.body.querySelectorAll("*")) {
          if (
            ["STYLE", "SVG", "PATH", "DEFS"].includes(
              node.tagName.toUpperCase(),
            )
          )
            continue;
          const box = node.getBoundingClientRect(),
            style = getComputedStyle(node);
          if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            box.width === 0 ||
            box.height === 0
          )
            continue;
          const hasText = Array.from(node.childNodes).some(
            (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
          );
          if (
            hasText &&
            (box.x < -0.5 ||
              box.y < -0.5 ||
              box.right > 1280.5 ||
              box.bottom > 720.5)
          )
            issues.push(
              `文字超出画布：${node.textContent?.trim().slice(0, 40)}`,
            );
          if (
            hasText &&
            (node.scrollWidth > node.clientWidth + 2 ||
              node.scrollHeight > node.clientHeight + 2) &&
            style.overflow !== "visible"
          )
            issues.push(
              `文字可能被裁切：${node.textContent?.trim().slice(0, 40)}`,
            );
        }
        return [...new Set(issues)].slice(0, 30);
      });
      results.push({ slideId: slide.id, title: slide.title, issues });
    }
    return {
      revision: p.revision,
      ok: results.length > 0 && results.every((r) => !r.issues.length),
      slides: results,
    };
  } finally {
    await browser.close();
  }
}
