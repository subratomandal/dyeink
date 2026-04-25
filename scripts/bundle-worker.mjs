#!/usr/bin/env node
// Bundles backend/src/worker.ts into platform/dist/_worker.js so that
// Cloudflare Pages picks it up as a catch-all Worker for the site.
// Same code that wrangler deploy uses, just packaged for Pages.

import { build } from 'esbuild'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')
const backendRoot = resolve(repoRoot, 'backend')
const platformRoot = resolve(repoRoot, 'platform')
const entry = resolve(repoRoot, 'backend/src/worker.ts')
const outDir = resolve(repoRoot, 'platform/dist')
const outFile = resolve(outDir, '_worker.js')
const assetsIgnoreFile = resolve(outDir, '.assetsignore')
const modulePaths = [
    resolve(repoRoot, 'node_modules'),
    resolve(backendRoot, 'node_modules'),
    resolve(platformRoot, 'node_modules'),
].filter(existsSync)

if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true })
}

await build({
    entryPoints: [entry],
    absWorkingDir: repoRoot,
    nodePaths: modulePaths,
    bundle: true,
    format: 'esm',
    target: 'es2022',
    platform: 'neutral',
    conditions: ['workerd', 'worker', 'browser'],
    mainFields: ['module', 'main'],
    outfile: outFile,
    minify: true,
    sourcemap: false,
    external: ['cloudflare:*', 'node:*'],
    legalComments: 'none',
    logLevel: 'info',
})

// Workers Assets must not upload Pages' _worker.js as a public static file.
// Pages still recognizes _worker.js as the server-side entrypoint.
writeFileSync(assetsIgnoreFile, '_worker.js\n')

console.log(`✓ Worker bundled → ${outFile}`)
