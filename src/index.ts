import { StudioTasks, type DshTaskContext } from "./studio-tasks.js";
import { resolve } from "node:path";
import { ProjectStore } from "./project.js";
import { studioHttp } from "./studio-service.js";
import { buildStudioTools } from "./studio-tools.js";
import { resolvePptStudioConfig } from "./config.js";
import { buildTools } from "./tools.js";
import type { PptStudioConfig, ToolDefinition } from "./types.js";

export const name = "dsh-ppt-studio";
export const inject = ["tools"];
export type Config = PptStudioConfig;

export interface PluginContext {
  agents?: DshTaskContext["agents"];
  attachments?: DshTaskContext["attachments"];
  agentDefaultModel?: DshTaskContext["agentDefaultModel"];
  tools: { register(definition: ToolDefinition): () => void };
  inject?(services: string[], callback: (ctx: PluginContext) => void): unknown;
  connection?: {
    fetch: {
      register(route: {
        path: string;
        methods: string[];
        fetch: (request: Request) => Promise<Response>;
      }): () => void;
    };
  };
  logger?: { info?(message: string): void; warn?(message: string): void };
  on?(event: string, listener: (...args: any[]) => any): () => void;
}

export function apply(ctx: PluginContext, config: Config = {}): void {
  const resolved = resolvePptStudioConfig(config);
  const disposers: Array<() => void> = [];

  const store = new ProjectStore(
    resolve(
      process.env.DSH_PPT_STUDIO_OUTPUT_DIR || resolved.outputDir,
      ".ppt-studio",
    ),
  );
  let taskContext: DshTaskContext | undefined;
  const tasks = new StudioTasks(store, () => taskContext);
  ctx.inject?.(["agents", "agentDefaultModel", "attachments"], (runtime) => {
    taskContext = runtime as DshTaskContext;
    runtime.on?.("dispose", () => {
      taskContext = undefined;
      return tasks.dispose();
    });
  });
  ctx.inject?.(["connection"], (webCtx) => {
    webCtx.connection!.fetch.register({
      path: "/api/ppt-studio",
      methods: ["POST"],
      fetch: studioHttp(store, tasks),
    });
  });
  for (const definition of [
    ...buildTools(resolved),
    ...buildStudioTools(store),
  ]) {
    disposers.push(ctx.tools.register(definition));
  }

  ctx.logger?.info?.("[dsh-ppt-studio] loaded");

  if (typeof ctx.on === "function") {
    ctx.on("dispose", () => {
      for (const dispose of disposers) dispose();
    });
  }
}

export { resolvePptStudioConfig } from "./config.js";
export { buildTools } from "./tools.js";
export { parseMarkdownSlides } from "./parser.js";
export {
  writeDeckArtifacts,
  renderDeckHtml,
  renderDeckManifest,
} from "./engine.js";
export type {
  PptStudioConfig,
  PptStudioCreateArgs,
  PptStudioCreateResult,
  PptStudioThemesResult,
  PptStudioSlide,
  PptStudioThemeId,
  PptStudioLanguage,
  ToolDefinition,
} from "./types.js";

export {
  ProjectStore,
  createProject,
  validateProject,
  prepareOutline,
} from "./project.js";
export type { Project, Slice } from "./project.js";
export {
  renderSlice,
  renderPresentation,
  exportProject,
  inspectProject,
} from "./web-renderer.js";
