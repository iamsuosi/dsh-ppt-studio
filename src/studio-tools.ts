import type { ToolDefinition } from "./types.js";
import { ProjectStore, type Project } from "./project.js";
import { studioAction } from "./studio-service.js";
export function buildStudioTools(
  store: ProjectStore,
  dispatch = (action: string, args: any) => studioAction(store, action, args),
): ToolDefinition[] {
  return [
    {
      name: "ppt_studio_project",
      description:
        "PPT project workflow. Use list/get to read the project and its source materials. Plan an outline via save (preserve all fields); let the user confirm it in Studio. Then use slide to write one free-designed 1280x720 HTML/CSS/SVG page at a time. No fixed layouts. Use asset:ID for uploaded images; inspect image filePath with DSH image/file tools. Asset data is omitted from tool responses; preserve asset id/name/filePath in save and the server keeps the original bytes. Do not use scripts, external assets, network fonts or fabricate facts. Read the latest revision before writes. Export html/pdf/json only when pages are ready. All actions use the same persisted project as the Studio UI.",
      parameters: {
        type: "object",
        required: ["action", "args"],
        properties: {
          action: {
            type: "string",
            enum: [
              "list",
              "create",
              "get",
              "save",
              "prepare",
              "confirm",
              "slide",
              "history",
              "restore",
              "check",
              "export",
            ],
          },
          args: {
            type: "object",
            additionalProperties: true,
            description:
              'Action arguments. get/history/check: {id}. create: {title,content,audience,goal,style}. save: {project: complete object from get, expectedRevision}. slide: {id,slideId,expectedRevision,html,css,notes}. confirm/prepare: {id,expectedRevision}. export: {id,format:"html"|"pdf"|"json"}. restore: {id,revision,expectedRevision}. Never confirm unless the user has approved the outline.',
          },
        },
      },
      output: {
        schema: {},
        render: (_args, value) => [
          { type: "text", text: JSON.stringify(value) },
        ],
      },
      execute: async (args) => {
        const input = structuredClone(args.args);
        if (args.action === "save" && Array.isArray(input?.project?.assets)) {
          const previous = store.get(input.project.id);
          input.project.assets = input.project.assets.map(
            (asset: Project["assets"][number]) =>
              asset.dataUrl
                ? asset
                : (previous.assets.find((item) => item.id === asset.id) ??
                  asset),
          );
        }
        const result = await dispatch(args.action, input);
        if (result && "schemaVersion" in result) {
          const project = result as Project;
          return {
            ...project,
            assets: project.assets.map((asset) => ({
              id: asset.id,
              name: asset.name,
              filePath: store.assetPath(project.id, asset),
            })),
          };
        }
        return result;
      },
    },
  ];
}
