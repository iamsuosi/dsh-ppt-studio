import type { PptStudioConfig, PptStudioLanguage, PptStudioThemeId } from './types.js';
export declare const DEFAULT_THEME: PptStudioThemeId;
export declare const DEFAULT_LANG: PptStudioLanguage;
export declare const DEFAULT_MAX_SLIDES = 30;
export declare const DSH_PPT_STUDIO_OUTPUT_DIR_ENV = "DSH_PPT_STUDIO_OUTPUT_DIR";
export declare function resolveTheme(input?: string): PptStudioThemeId;
export declare function resolveLang(input?: string): PptStudioLanguage;
export declare function clampInt(value: unknown, fallback: number, min: number, max: number): number;
export declare function resolveOutputDir(config?: PptStudioConfig, arg?: string, cwd?: string): string;
export declare function resolvePptStudioConfig(config?: PptStudioConfig): Required<PptStudioConfig>;
//# sourceMappingURL=config.d.ts.map