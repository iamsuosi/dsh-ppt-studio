import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
export const DEFAULT_THEME = 'data';
export const DEFAULT_LANG = 'zh';
export const DEFAULT_MAX_SLIDES = 30;
export const DSH_PPT_STUDIO_OUTPUT_DIR_ENV = 'DSH_PPT_STUDIO_OUTPUT_DIR';
const VALID_THEMES = ['data', 'swiss', 'velvet', 'soft', 'bold'];
const VALID_LANGS = ['zh', 'en'];
export function resolveTheme(input) {
    const id = (input ?? DEFAULT_THEME).trim().toLowerCase();
    if (!VALID_THEMES.includes(id))
        return DEFAULT_THEME;
    return id;
}
export function resolveLang(input) {
    const id = (input ?? DEFAULT_LANG).trim().toLowerCase();
    if (!VALID_LANGS.includes(id))
        return DEFAULT_LANG;
    return id;
}
export function clampInt(value, fallback, min, max) {
    const n = typeof value === 'number' ? Math.trunc(value) : fallback;
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(max, Math.max(min, n));
}
export function resolveOutputDir(config, arg, cwd) {
    const fromEnv = process.env[DSH_PPT_STUDIO_OUTPUT_DIR_ENV];
    const dir = arg || fromEnv || config?.outputDir || (cwd ?? process.cwd());
    const resolved = resolve(dir);
    mkdirSync(resolved, { recursive: true });
    return resolved;
}
export function resolvePptStudioConfig(config = {}) {
    return {
        outputDir: config.outputDir ?? process.cwd(),
        defaultTheme: resolveTheme(config.defaultTheme),
        defaultLang: resolveLang(config.defaultLang),
        maxSlides: clampInt(config.maxSlides, DEFAULT_MAX_SLIDES, 3, 120),
    };
}
//# sourceMappingURL=config.js.map