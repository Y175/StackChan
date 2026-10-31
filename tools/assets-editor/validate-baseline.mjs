import { readFile, readdir } from 'node:fs/promises'
import { decodeAssets } from './StackChanAssets.js'

const raw = await readFile(process.argv[2])
const files = decodeAssets(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength))
const index = JSON.parse(new TextDecoder().decode(files.get('index.json').data))
for (const filename of ['icon_ai_agent.bin', index.srmodels, index.text_font]) {
  if (!filename || !files.has(filename)) throw new Error(`Incomplete StackChan baseline: ${filename}`)
}
const systemAssets = new URL('../../firmware/main/assets/assets_bin/', import.meta.url)
for (const filename of await readdir(systemAssets)) {
  const expected = await readFile(new URL(filename, systemAssets))
  const actual = files.get(filename)
  if (!actual || !expected.equals(Buffer.from(actual.data))) {
    throw new Error(`Baseline does not match this firmware's system resource: ${filename}`)
  }
}
console.log(`Validated StackChan baseline: ${files.size} files, ${raw.byteLength} bytes`)
