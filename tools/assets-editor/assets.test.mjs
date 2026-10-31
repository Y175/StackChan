import test from 'node:test'
import assert from 'node:assert/strict'
import SpiffsGenerator from './upstream/web/src/utils/SpiffsGenerator.js'
import { decodeAssets, mergeStackChanAssets, ASSETS_PARTITION_SIZE } from './StackChanAssets.js'

const encode = value => new TextEncoder().encode(JSON.stringify(value)).buffer
const config = () => ({
  chip: { model: 'esp32s3', display: { width: 320, height: 240, color: 'RGB565' } },
  theme: { wakeword: { type: 'none' }, font: { type: 'none' }, emoji: { type: 'none' } }
})

async function baseline() {
  const pack = new SpiffsGenerator()
  pack.addFile('index.json', encode({ version: 1, srmodels: 'srmodels.bin', text_font: 'font.bin' }))
  pack.addFile('srmodels.bin', new Uint8Array([10, 20, 30]).buffer)
  pack.addFile('font.bin', new Uint8Array([40, 50, 60]).buffer)
  pack.addFile('icon_ai_agent.bin', new Uint8Array([255, 0, 1]).buffer)
  return decodeAssets(await pack.generate())
}

test('default selections preserve stock wake word, font and menu bytes', async () => {
  const stock = await baseline()
  const pack = new SpiffsGenerator()
  pack.addFile('index.json', encode({ version: 1, hide_subtitle: false }))
  mergeStackChanAssets(pack, stock, config())
  const result = decodeAssets(await pack.generate())
  for (const name of ['srmodels.bin', 'font.bin', 'icon_ai_agent.bin']) {
    assert.deepEqual(result.get(name).data, stock.get(name).data)
  }
  const index = JSON.parse(new TextDecoder().decode(result.get('index.json').data))
  assert.equal(index.stackchan.custom_emotions, false)
  assert.equal(index.srmodels, 'srmodels.bin')
})

test('custom model and emotion replace their references while menus remain', async () => {
  const pack = new SpiffsGenerator()
  pack.addFile('index.json', encode({ version: 1, srmodels: 'srmodels.bin',
    multinet_model: { commands: [{ command: 'ni hao peng you', text: '你好朋友', action: 'wake' }] },
    emoji_collection: [{ name: 'happy', file: 'happy.gif' }] }))
  pack.addFile('srmodels.bin', new Uint8Array([99, 98]).buffer)
  pack.addFile('happy.gif', new Uint8Array([71, 73, 70]).buffer, { width: 64, height: 64 })
  const custom = config()
  custom.theme.wakeword.type = 'custom'
  custom.theme.emoji.type = 'custom'
  mergeStackChanAssets(pack, await baseline(), custom)
  const result = decodeAssets(await pack.generate())
  assert.deepEqual(new Uint8Array(result.get('srmodels.bin').data), new Uint8Array([99, 98]))
  assert.ok(result.has('icon_ai_agent.bin'))
  const index = JSON.parse(new TextDecoder().decode(result.get('index.json').data))
  assert.equal(index.stackchan.custom_emotions, true)
  assert.equal(index.multinet_model.commands[0].action, 'wake')
})

test('wrong board, reserved filenames and overflow fail visibly', async () => {
  const stock = await baseline()
  const pack = new SpiffsGenerator()
  pack.addFile('index.json', encode({ version: 1 }))
  const wrong = config()
  wrong.chip.model = 'esp32c3'
  assert.throws(() => mergeStackChanAssets(pack, stock, wrong), /仅支持 StackChan/)
  pack.addFile('icon_ai_agent.bin', new ArrayBuffer(1))
  assert.throws(() => mergeStackChanAssets(pack, stock, config()), /重名/)
  const huge = new SpiffsGenerator()
  huge.addFile('index.json', encode({ version: 1 }))
  huge.addFile('extra.bin', new ArrayBuffer(ASSETS_PARTITION_SIZE))
  assert.throws(() => mergeStackChanAssets(huge, stock, config()), /超过/)
})

test('damaged binary checksum is rejected before it can be repackaged', async () => {
  const pack = new SpiffsGenerator()
  pack.addFile('index.json', encode({ version: 1 }))
  const bytes = new Uint8Array(await pack.generate())
  bytes[bytes.length - 1] ^= 1
  assert.throws(() => decodeAssets(bytes.buffer), /校验失败/)
})
