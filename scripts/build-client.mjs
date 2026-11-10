// Bundles src/client into lib/client.js: one browser script that registers itself
// with the DSH module loader. React comes from the host at runtime (see src/client/react.ts).
import { context, build } from 'esbuild'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const watch = process.argv.includes('--watch')

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: [join(root, 'src', 'client', 'index.tsx')],
  outfile: join(root, 'lib', 'client.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  jsx: 'transform',
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
  charset: 'utf8',
  legalComments: 'none',
  sourcemap: watch ? 'inline' : false,
  logLevel: 'info',
  plugins: [
    {
      name: 'stamp',
      setup(b) {
        b.onEnd((r) => {
          if (!r.errors.length) console.log(`[${new Date().toLocaleTimeString()}] lib/client.js built`)
        })
      },
    },
  ],
}

if (watch) {
  const ctx = await context(options)
  await ctx.watch()
  console.log('watching src/client ...')
} else {
  await build(options)
}
