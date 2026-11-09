export type PptStudioThemeId = 'data' | 'swiss' | 'velvet' | 'soft' | 'bold';
export type PptStudioLanguage = 'zh' | 'en';
export interface PptStudioConfig {
    outputDir?: string;
    defaultTheme?: PptStudioThemeId;
    defaultLang?: PptStudioLanguage;
    maxSlides?: number;
}
export interface PptStudioCreateArgs {
    title: string;
    content?: string;
    theme?: PptStudioThemeId;
    lang?: PptStudioLanguage;
    outputDir?: string;
    fileName?: string;
    maxSlides?: number;
}
export interface PptStudioSlide {
    layout: 'cover' | 'section' | 'bullets' | 'statement' | 'closing';
    title: string;
    subtitle?: string;
    bullets?: string[];
}
export interface PptStudioCreateResult {
    ok: boolean;
    pptxPath: string;
    htmlPath: string;
    jsonPath: string;
    slideCount: number;
    theme: PptStudioThemeId;
    lang: PptStudioLanguage;
}
export interface PptStudioThemesResult {
    themes: Array<{
        id: PptStudioThemeId;
        name: string;
        mood: string;
        bestFor: string;
    }>;
}
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (args: any, exec: any) => Promise<any>;
}
//# sourceMappingURL=types.d.ts.map