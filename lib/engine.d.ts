import type { PptStudioCreateResult, PptStudioLanguage, PptStudioSlide, PptStudioThemeId } from './types.js';
import type { Theme } from './themes.js';
export interface BuildDeckOptions {
    title: string;
    slides: PptStudioSlide[];
    theme: PptStudioThemeId;
    lang: PptStudioLanguage;
    outputDir: string;
    fileName?: string;
    overwrite?: boolean;
}
export declare function writeDeckArtifacts(options: BuildDeckOptions): PptStudioCreateResult;
export declare function renderDeckHtml(title: string, slides: PptStudioSlide[], theme: Theme, lang: PptStudioLanguage): string;
export declare function renderDeckManifest(title: string, slides: PptStudioSlide[], theme: PptStudioThemeId, lang: PptStudioLanguage): object;
//# sourceMappingURL=engine.d.ts.map