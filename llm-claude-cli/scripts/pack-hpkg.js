#!/usr/bin/env node
// scripts/pack-hpkg.js
// Packages plugin.cjs + manifests into a distributable .hpkg archive.
//
// Usage:
//   node scripts/pack-hpkg.js
//   node scripts/pack-hpkg.js --out dist/
//
// Produces: claude-cli-{version}.hpkg (ZIP containing 3 files)

import { createHash }    from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { createWriteStream } from 'node:fs'
import { fileURLToPath } from 'node:url'

// ─── Paths ────────────────────────────────────────────────────────────────────

const __dirname  = dirname(fileURLToPath(import.meta.url))
const ROOT       = resolve(__dirname, '..')
const PLUGIN_CJS = resolve(ROOT, 'plugin.cjs')
const PKG_JSON   = resolve(ROOT, 'package.json')
const PLUGIN_MF  = resolve(ROOT, 'harmoven-plugin.json')

// ─── Parse CLI args ───────────────────────────────────────────────────────────

const args    = process.argv.slice(2)
const outIdx  = args.indexOf('--out')
const outDir  = outIdx !== -1 ? resolve(args[outIdx + 1]) : ROOT

// ─── Read inputs ──────────────────────────────────────────────────────────────

const pkg        = JSON.parse(readFileSync(PKG_JSON, 'utf8'))
const pluginMeta = JSON.parse(readFileSync(PLUGIN_MF, 'utf8'))
const bundle     = readFileSync(PLUGIN_CJS)

const version = pkg.version
if (!version) {
  console.error('ERROR: package.json has no version field')
  process.exit(1)
}

// ─── Compute SHA-256 ─────────────────────────────────────────────────────────

const sha256 = createHash('sha256').update(bundle).digest('hex')
console.log(`plugin.cjs  ${bundle.length} bytes  sha256=${sha256}`)

// ─── Build manifest.json (top-level hpkg manifest) ───────────────────────────

const manifest = {
  schema_version:  '1.0',
  capability_type: 'llm_provider_plugin',
  pack_id:         pluginMeta.pack_id,
  name:            pluginMeta.name,
  version:         version,
  author:          pluginMeta.author ?? 'community',
  description:     pluginMeta.description,
  tags:            pluginMeta.tags ?? [],
  content_sha256:  sha256,
}

// ─── Build updated harmoven-plugin.json ──────────────────────────────────────

const updatedPluginMeta = {
  ...pluginMeta,
  version,
  content_sha256: sha256,
}

// ─── Pack into ZIP ────────────────────────────────────────────────────────────

// Dynamically import jszip (CommonJS interop)
const { default: JSZip } = await import('jszip')

const zip = new JSZip()
zip.file('manifest.json',        JSON.stringify(manifest, null, 2))
zip.file('harmoven-plugin.json', JSON.stringify(updatedPluginMeta, null, 2))
zip.file('plugin.cjs',           bundle)

const zipBuffer = await zip.generateAsync({
  type:               'nodebuffer',
  compression:        'DEFLATE',
  compressionOptions: { level: 6 },
})

// ─── Write output ─────────────────────────────────────────────────────────────

mkdirSync(outDir, { recursive: true })
const outFile = resolve(outDir, `claude-cli-${version}.hpkg`)
writeFileSync(outFile, zipBuffer)

const kb = (zipBuffer.length / 1024).toFixed(1)
console.log(`\nWrote ${outFile}  (${kb} KB)`)
console.log(`\nInstall via:\n  POST /api/admin/llm-plugins/install  (multipart, field: file)`)
