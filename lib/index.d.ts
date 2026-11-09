import type { PptStudioConfig, ToolDefinition } from './types.js';
export declare const name = "dsh-ppt-studio";
export declare const inject: string[];
export type Config = PptStudioConfig;
export interface PluginContext {
    tools: {
        register(definition: ToolDefinition): () => void;
    };
    logger?: {
        info?(message: string): void;
        warn?(message: string): void;
    };
    on?(event: string, listener: () => void): () => void;
}
export declare function apply(ctx: PluginContext, config?: Config): void;
export { resolvePptStudioConfig } from './config.js';
export { buildTools } from './tools.js';
export { parseMarkdownSlides } from './parser.js';
export { writeDeckArtifacts, renderDeckHtml, renderDeckManifest } from './engine.js';
export type { PptStudioConfig, PptStudioCreateArgs, PptStudioCreateResult, PptStudioThemesResult, PptStudioSlide, PptStudioThemeId, PptStudioLanguage, ToolDefinition, } from './types.js';
//# sourceMappingURL=index.d.ts.map