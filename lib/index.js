import { resolvePptStudioConfig } from './config.js';
import { buildTools } from './tools.js';
export const name = 'dsh-ppt-studio';
export const inject = ['tools'];
export function apply(ctx, config = {}) {
    const resolved = resolvePptStudioConfig(config);
    const disposers = [];
    for (const definition of buildTools(resolved)) {
        disposers.push(ctx.tools.register(definition));
    }
    ctx.logger?.info?.('[dsh-ppt-studio] loaded');
    if (typeof ctx.on === 'function') {
        ctx.on('dispose', () => {
            for (const dispose of disposers)
                dispose();
        });
    }
}
export { resolvePptStudioConfig } from './config.js';
export { buildTools } from './tools.js';
export { parseMarkdownSlides } from './parser.js';
export { writeDeckArtifacts, renderDeckHtml, renderDeckManifest } from './engine.js';
//# sourceMappingURL=index.js.map