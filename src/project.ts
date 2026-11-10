import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

export interface Slice {
  id: string;
  title: string;
  intent: string;
  points: string[];
  sourceIds: string[];
  notes: string;
  html: string;
  css: string;
  status: "outline" | "ready";
}
export interface Project {
  schemaVersion: 1;
  id: string;
  revision: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  brief: { audience: string; goal: string; style: string; language: string };
  sources: { id: string; name: string; text: string }[];
  assets: { id: string; name: string; dataUrl: string }[];
  slides: Slice[];
  outlineConfirmed: boolean;
  review?: { sampleIds: string[]; approved: boolean };
}
export class StudioError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function text(value: unknown, name: string, max = 20000): string {
  if (typeof value !== "string" || value.length > max)
    throw new StudioError(`${name} 必须是字符串，最多 ${max} 字符`);
  return value.trim();
}
function strings(value: unknown, name: string): string[] {
  if (!Array.isArray(value) || value.length > 100)
    throw new StudioError(`${name} 必须是数组（最多 100 项）`);
  return value.map((v) => text(v, name, 10000));
}
export function validateProject(value: unknown): Project {
  const p = value as Project;
  if (
    !p ||
    p.schemaVersion !== 1 ||
    !/^[a-f0-9-]{36}$/.test(p.id) ||
    !Number.isSafeInteger(p.revision) ||
    p.revision < 1
  )
    throw new StudioError("无效的项目版本或 ID");
  for (const key of ["createdAt", "updatedAt"] as const) {
    if (!Number.isFinite(Date.parse(text(p[key], key, 60))))
      throw new StudioError(`${key} 日期无效`);
  }
  if (!text(p.title, "标题", 200)) throw new StudioError("请填写标题");
  if (!p.brief || typeof p.outlineConfirmed !== "boolean")
    throw new StudioError("缺少 brief 或大纲状态");
  for (const k of ["audience", "goal", "style", "language"] as const)
    text(p.brief[k], k, 5000);
  if (
    !Array.isArray(p.sources) ||
    p.sources.length > 30 ||
    !Array.isArray(p.assets) ||
    p.assets.length > 30 ||
    !Array.isArray(p.slides) ||
    p.slides.length > 60
  )
    throw new StudioError("素材最多 30 份，图片最多 30 张，页面最多 60 页");
  const unique = (ids: string[]) => {
    if (
      new Set(ids).size !== ids.length ||
      ids.some((id) => !/^[\w-]{1,80}$/.test(id))
    )
      throw new StudioError("ID 重复或格式无效");
  };
  unique(p.sources.map((s) => s.id));
  unique(p.assets.map((a) => a.id));
  unique(p.slides.map((s) => s.id));
  for (const s of p.sources) {
    text(s.name, "素材名称", 200);
    text(s.text, "素材文本", 200000);
  }
  for (const a of p.assets) {
    text(a.name, "图片名称", 200);
    if (
      typeof a.dataUrl !== "string" ||
      a.dataUrl.length > 7000000 ||
      !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(a.dataUrl)
    )
      throw new StudioError("图片仅支持 PNG / JPEG / WebP，每张最多约 5 MB");
  }
  for (const s of p.slides) {
    if (!text(s.title, "页面标题", 300))
      throw new StudioError("页面标题不能为空");
    text(s.intent, "页面意图", 3000);
    strings(s.points, "要点");
    strings(s.sourceIds, "来源");
    text(s.notes, "讲稿", 20000);
    text(s.html, "HTML", 200000);
    text(s.css, "CSS", 100000);
    if (
      !["outline", "ready"].includes(s.status) ||
      (s.status === "ready" && !s.html.trim())
    )
      throw new StudioError("页面状态与内容不一致");
    if (s.sourceIds.some((id) => !p.sources.some((source) => source.id === id)))
      throw new StudioError("页面引用了不存在的素材");
  }
  if (!p.review) p.review = { sampleIds: [], approved: false };
  if (
    !Array.isArray(p.review.sampleIds) ||
    p.review.sampleIds.length > 2 ||
    typeof p.review.approved !== "boolean" ||
    new Set(p.review.sampleIds).size !== p.review.sampleIds.length ||
    p.review.sampleIds.some((id) => !p.slides.some((s) => s.id === id))
  )
    throw new StudioError("视觉审阅状态无效");
  if (
    p.review.approved &&
    (!p.outlineConfirmed ||
      !p.review.sampleIds.length ||
      p.review.sampleIds.some(
        (id) => p.slides.find((s) => s.id === id)?.status !== "ready",
      ))
  )
    throw new StudioError("请先完成代表页审阅");
  if (p.outlineConfirmed && !p.slides.length)
    throw new StudioError("空大纲不能确认");
  if (JSON.stringify(p).length > 24000000)
    throw new StudioError("项目超过 24 MB 限制");
  return p;
}
export function createProject(input: {
  title: string;
  content?: string;
  audience?: string;
  goal?: string;
  style?: string;
}): Project {
  const now = new Date().toISOString();
  const content = text(input.content ?? "", "输入材料", 200000)
    .replace(/\r\n?/g, "\n")
    .replace(/\u0000/g, "");
  return validateProject({
    schemaVersion: 1,
    id: randomUUID(),
    revision: 1,
    title: text(input.title, "标题", 200),
    createdAt: now,
    updatedAt: now,
    brief: {
      audience: input.audience || "",
      goal: input.goal || "",
      style: input.style || "",
      language: "zh",
    },
    sources: content
      ? [{ id: "source-1", name: "输入材料", text: content }]
      : [],
    assets: [],
    slides: [],
    outlineConfirmed: false,
  });
}
/** A reversible extraction draft, not an LLM-generated narrative. */
export function prepareOutline(p: Project): Slice[] {
  const sections = p.sources.flatMap((source) => {
    const blocks = source.text.split(/^#{1,3}\s+/m).filter((s) => s.trim());
    return blocks.map((block) => {
      const lines = block
        .trim()
        .split("\n")
        .map((s) => s.replace(/^[-*]\s+/, "").trim())
        .filter(Boolean);
      return {
        id: randomUUID(),
        title: lines[0].slice(0, 160),
        intent: "",
        points: lines.slice(1),
        sourceIds: [source.id],
        notes: "",
        html: "",
        css: "",
        status: "outline" as const,
      };
    });
  });
  if (!sections.length)
    sections.push({
      id: randomUUID(),
      title: p.title,
      intent: "",
      points: [],
      sourceIds: [],
      notes: "",
      html: "",
      css: "",
      status: "outline",
    });
  if (sections.length > 60)
    throw new StudioError("材料包含超过 60 个章节，请合并后再准备大纲");
  return sections;
}
export class ProjectStore {
  private writers = new Map<string, string>();
  lock(id: string, token: string) {
    this.get(id);
    if (this.writers.has(id))
      throw new StudioError("AI 任务正在运行，请等待完成或取消", 409);
    this.writers.set(id, token);
  }
  unlock(id: string, token: string) {
    if (this.writers.get(id) === token) this.writers.delete(id);
  }
  assertWritable(id: string, token?: string) {
    if (this.writers.has(id) && this.writers.get(id) !== token)
      throw new StudioError("AI 任务正在运行，请等待完成或取消", 409);
  }

  constructor(public root: string) {
    mkdirSync(root, { recursive: true });
  }
  private directory(id: string) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new StudioError("项目 ID 无效");
    return join(this.root, id);
  }
  list() {
    return readdirSync(this.root)
      .filter((id) => /^[a-f0-9-]{36}$/.test(id))
      .map((id) => this.get(id))
      .map(({ id, title, revision, updatedAt, slides }) => ({
        id,
        title,
        revision,
        updatedAt,
        slideCount: slides.length,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  get(id: string): Project {
    const path = join(this.directory(id), "project.json");
    if (!existsSync(path)) throw new StudioError("项目不存在", 404);
    return validateProject(JSON.parse(readFileSync(path, "utf8")));
  }
  save(
    value: Project,
    expectedRevision?: number,
    writerToken?: string,
  ): Project {
    this.assertWritable(value.id, writerToken);
    const p = structuredClone(validateProject(value)),
      dir = this.directory(p.id),
      file = join(dir, "project.json");
    if (existsSync(file)) {
      const current = this.get(p.id);
      if (expectedRevision !== current.revision)
        throw new StudioError("项目已被其他操作更新，请刷新后重试", 409);
      p.revision = current.revision + 1;
    } else if (expectedRevision !== undefined)
      throw new StudioError("项目不存在", 404);
    p.updatedAt = new Date().toISOString();
    mkdirSync(join(dir, "revisions"), { recursive: true });
    mkdirSync(join(dir, "assets"), { recursive: true });
    for (const asset of p.assets) {
      const [, subtype, data] = asset.dataUrl.match(
        /^data:image\/(png|jpeg|webp);base64,(.+)$/,
      )!;
      writeFileSync(
        join(dir, "assets", `${asset.id}.${subtype}`),
        Buffer.from(data, "base64"),
      );
    }
    const json = JSON.stringify(p, null, 2),
      temp = join(dir, `${randomUUID()}.tmp`);
    writeFileSync(temp, json);
    renameSync(temp, file);
    writeFileSync(join(dir, "revisions", `${p.revision}.json`), json);
    return p;
  }
  assetPath(id: string, asset: Project["assets"][number]) {
    return join(
      this.directory(id),
      "assets",
      `${asset.id}.${asset.dataUrl.match(/^data:image\/(png|jpeg|webp);/)![1]}`,
    );
  }
  history(id: string) {
    this.get(id);
    return readdirSync(join(this.directory(id), "revisions"))
      .map((f) => Number(f.replace(".json", "")))
      .filter(Number.isInteger)
      .sort((a, b) => b - a);
  }
  restore(id: string, revision: number, expectedRevision: number) {
    if (!Number.isSafeInteger(revision) || revision < 1)
      throw new StudioError("修订号无效");
    const file = join(this.directory(id), "revisions", `${revision}.json`);
    if (!existsSync(file)) throw new StudioError("修订不存在", 404);
    return this.save(JSON.parse(readFileSync(file, "utf8")), expectedRevision);
  }
  path(id: string) {
    this.get(id);
    return this.directory(id);
  }
}
