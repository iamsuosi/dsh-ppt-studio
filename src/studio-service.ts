import { readFileSync } from "node:fs";
import {
  ProjectStore,
  createProject,
  prepareOutline,
  StudioError,
  validateProject,
  type Project,
} from "./project.js";
import { exportProject, renderSlice, inspectProject } from "./web-renderer.js";
export async function studioAction(
  store: ProjectStore,
  action: string,
  args: any = {},
  writerToken?: string,
) {
  switch (action) {
    case "list":
      return store.list();
    case "create":
      return store.save(createProject(args));
    case "get":
      return store.get(args.id);
    case "save": {
      const submitted = structuredClone(args.project);
      submitted.review = { sampleIds: [], approved: false };
      const next = validateProject(submitted);
      const current = store.get(next.id);
      const same = (a: unknown, b: unknown) =>
        JSON.stringify(a) === JSON.stringify(b);
      const briefChanged = !same(current.brief, next.brief);
      const changedSources = new Set(
        [...current.sources, ...next.sources]
          .filter(
            (source) =>
              !same(
                current.sources.find((s) => s.id === source.id),
                next.sources.find((s) => s.id === source.id),
              ),
          )
          .map((s) => s.id),
      );
      const changedAssets = new Set(
        [...current.assets, ...next.assets]
          .filter(
            (asset) =>
              !same(
                current.assets.find((a) => a.id === asset.id),
                next.assets.find((a) => a.id === asset.id),
              ),
          )
          .map((a) => a.id),
      );
      if (
        briefChanged ||
        changedSources.size ||
        !same(
          current.slides.map((s) => s.id),
          next.slides.map((s) => s.id),
        )
      )
        next.outlineConfirmed = false;
      for (const slide of next.slides) {
        const previous = current.slides.find((s) => s.id === slide.id);
        const outlineChanged =
          !previous ||
          !same(
            [
              previous.title,
              previous.intent,
              previous.points,
              previous.sourceIds,
            ],
            [slide.title, slide.intent, slide.points, slide.sourceIds],
          );
        const sourceChanged = slide.sourceIds.some((id) =>
          changedSources.has(id),
        );
        const assetChanged = [...changedAssets].some((id) =>
          (slide.html + slide.css).includes(`asset:${id}`),
        );
        if (outlineChanged) next.outlineConfirmed = false;
        if (briefChanged || outlineChanged || sourceChanged || assetChanged) {
          slide.status = "outline";
          // Keep the old code as context for the agent, but prevent stale delivery.
        }
      }
      next.review = structuredClone(current.review!);
      if (
        !next.outlineConfirmed ||
        next.slides.some(
          (s) =>
            current.review?.sampleIds.includes(s.id) &&
            (s.html !== current.slides.find((old) => old.id === s.id)?.html ||
              s.css !== current.slides.find((old) => old.id === s.id)?.css ||
              s.status !== "ready"),
        )
      )
        next.review = { sampleIds: [], approved: false };
      return store.save(next, args.expectedRevision, writerToken);
    }
    case "prepare": {
      const p = store.get(args.id);
      if (p.slides.some((s) => s.html))
        throw new StudioError(
          "已有页面内容，请通过大纲编辑修改，避免覆盖已生成页面",
        );
      p.slides = prepareOutline(p);
      p.outlineConfirmed = false;
      p.review = { sampleIds: [], approved: false };
      return store.save(p, args.expectedRevision, writerToken);
    }
    case "confirm": {
      const p = store.get(args.id);
      p.outlineConfirmed = true;
      const sampleIds = p.slides.length
        ? [
            ...new Set([
              p.slides[0].id,
              p.slides[Math.floor(p.slides.length / 2)].id,
            ]),
          ]
        : [];
      p.review = { sampleIds, approved: false };
      return store.save(p, args.expectedRevision, writerToken);
    }
    case "approve-design": {
      const p = store.get(args.id);
      if (
        !p.outlineConfirmed ||
        !p.review?.sampleIds.length ||
        p.review.sampleIds.some(
          (id) => p.slides.find((s) => s.id === id)?.status !== "ready",
        )
      )
        throw new StudioError("请先确认大纲并完成代表页");
      p.review.approved = true;
      return store.save(p, args.expectedRevision, writerToken);
    }
    case "slide": {
      const p = store.get(args.id);
      if (!p.outlineConfirmed) throw new StudioError("请先确认大纲");
      const s = p.slides.find((s) => s.id === args.slideId);
      if (!s) throw new StudioError("页面不存在", 404);
      if (
        p.review?.sampleIds.includes(s.id) &&
        (s.html !== args.html || s.css !== (args.css ?? ""))
      )
        p.review.approved = false;
      s.html = args.html;
      s.css = args.css ?? "";
      s.notes = args.notes ?? s.notes;
      s.status = "ready";
      return store.save(p, args.expectedRevision, writerToken);
    }
    case "check":
      return inspectProject(store.get(args.id));
    case "history":
      return store.history(args.id);
    case "restore":
      return store.restore(args.id, args.revision, args.expectedRevision);
    case "preview": {
      const p = store.get(args.id);
      const s = p.slides.find((s) => s.id === args.slideId);
      if (!s) throw new StudioError("页面不存在", 404);
      return { html: renderSlice(p, s) };
    }
    case "export": {
      if (!["html", "pdf", "json"].includes(args.format))
        throw new StudioError("仅支持 HTML、PDF、项目 JSON");
      const p = store.get(args.id);
      return {
        path: await exportProject(p, store.path(p.id), args.format),
        revision: p.revision,
        format: args.format,
      };
    }
    case "import": {
      const p = validateProject(args.project);
      return store.save({
        ...p,
        id: createProject({ title: p.title }).id,
        revision: 1,
      });
    }
    default:
      throw new StudioError("未知操作", 404);
  }
}
export function studioHttp(
  store: ProjectStore,
  tasks?: { handle(action: string, args: any): Promise<unknown> },
) {
  return async (request: Request): Promise<Response> => {
    try {
      if (Number(request.headers.get("content-length")) > 25000000)
        throw new StudioError("请求超过 25 MB", 413);
      const raw = await request.text();
      if (raw.length > 25000000) throw new StudioError("请求超过 25 MB", 413);
      const { action, args } = JSON.parse(raw);
      const result = action.startsWith("task-")
        ? tasks
          ? await tasks.handle(action, args)
          : (() => {
              throw new StudioError("DSH 会话服务尚未就绪", 503);
            })()
        : await studioAction(store, action, args);
      if (action === "export") {
        const r = result as { path: string; format: string };
        return new Response(new Uint8Array(readFileSync(r.path)), {
          headers: {
            "content-type":
              r.format === "pdf"
                ? "application/pdf"
                : r.format === "html"
                  ? "text/html; charset=utf-8"
                  : "application/json",
            "content-disposition": `attachment; filename="presentation.${r.format}"`,
            "cache-control": "no-store",
          },
        });
      }
      return Response.json(result, {
        headers: { "cache-control": "no-store" },
      });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "操作失败" },
        { status: error instanceof StudioError ? error.status : 400 },
      );
    }
  };
}
