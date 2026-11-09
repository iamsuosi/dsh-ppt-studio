export interface Theme {
    id: string;
    name: {
        zh: string;
        en: string;
    };
    mood: {
        zh: string;
        en: string;
    };
    bestFor: {
        zh: string;
        en: string;
    };
    dark: boolean;
    palette: {
        bg: string;
        panel: string;
        fg: string;
        muted: string;
        accent: string;
        accent2: string;
    };
    fonts: {
        heading: string;
        body: string;
    };
}
export declare const THEMES: Record<string, Theme>;
export declare const THEME_IDS: string[];
export declare function resolveTheme(id?: string): Theme;
//# sourceMappingURL=themes.d.ts.map