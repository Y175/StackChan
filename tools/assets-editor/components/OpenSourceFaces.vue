<template>
  <section class="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h4 class="font-semibold text-slate-900">StackChan 像素伙伴</h4>
        <p class="mt-1 text-sm text-slate-600">7 个循环动画 · 平静、思考、开心、困倦、害羞、得意、生气</p>
      </div>
      <span class="rounded-full bg-white border px-3 py-1 text-xs text-slate-600">开源 · MIT</span>
    </div>
    <div class="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-7 gap-2">
      <figure v-for="face in faces" :key="face.file" class="overflow-hidden rounded-lg bg-slate-900">
        <img :src="`${assetPath}/${face.file}.gif`" :alt="face.label" class="aspect-square w-full object-contain" />
        <figcaption class="pb-2 text-center text-xs text-slate-300">{{ face.label }}</figcaption>
      </figure>
    </div>
    <p class="text-sm text-slate-600">导出时统一适配为 192 × 192。其余情绪使用平静动画；应用后可以逐项替换图片。GIF 循环播放，不提供实时嘴型同步。</p>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="text-xs text-slate-500">
        作者：stackchan-mcp contributors ·
        <a href="https://github.com/migratorywhale/stackchan-mcp" target="_blank" rel="noopener noreferrer" class="underline">源码</a>
        · <a :href="`${assetPath}/LICENSE.txt`" target="_blank" rel="noopener noreferrer" class="underline">许可证</a>
      </div>
      <button :disabled="isApplying" @click="applyPack" class="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-50">
        {{ isApplying ? '正在载入…' : '使用这套动画' }}
      </button>
    </div>
    <p v-if="errorMessage" role="alert" class="text-sm text-red-700">{{ errorMessage }}</p>
    <p v-if="applied" role="status" class="text-sm text-emerald-700">已载入到自定义表情，可以预览或导出。</p>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import configStorage from '@/utils/ConfigStorage.js'

// Only the seven upstream animations are unique. Other protocol emotions explicitly use calm.
const faces = [
  { file: 'calm', emotion: 'neutral', label: '平静' },
  { file: 'thinking', emotion: 'thinking', label: '思考' },
  { file: 'happy', emotion: 'happy', label: '开心' },
  { file: 'sleepy', emotion: 'sleepy', label: '困倦' },
  { file: 'shy', emotion: 'embarrassed', label: '害羞' },
  { file: 'smug', emotion: 'confident', label: '得意' },
  { file: 'pouty', emotion: 'angry', label: '生气' }
]
const emotions = ['neutral', 'happy', 'laughing', 'funny', 'sad', 'angry', 'crying', 'loving', 'embarrassed',
  'surprised', 'shocked', 'thinking', 'winking', 'cool', 'relaxed', 'delicious', 'kissy', 'confident', 'sleepy', 'silly', 'confused']
const assetPath = `${import.meta.env.BASE_URL}open-source-faces/stackchan-pixel`
const emit = defineEmits(['apply'])
const isApplying = ref(false)
const applied = ref(false)
const errorMessage = ref('')

/** Load and persist the licensed original files before replacing the current emotion selection. */
async function applyPack() {
  isApplying.value = true
  applied.value = false
  errorMessage.value = ''
  try {
    const fileMap = {}
    const emotionMap = {}
    const images = {}
    for (const face of faces) {
      const response = await fetch(`${assetPath}/${face.file}.gif`)
      if (!response.ok) {
        throw new Error(`无法载入 ${face.label}：HTTP ${response.status}`)
      }
      const data = await response.arrayBuffer()
      const digest = await crypto.subtle.digest('SHA-256', data)
      const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
      const file = new File([data], `${face.file}.gif`, { type: 'image/gif' })
      await configStorage.saveFile(`hash_${hash}`, file, 'emoji', { format: 'gif', size: { width: 192, height: 192 } })
      fileMap[hash] = file
      emotionMap[face.emotion] = hash
    }
    for (const emotion of emotions) {
      if (!emotionMap[emotion]) {
        emotionMap[emotion] = emotionMap.neutral
      }
      images[emotion] = fileMap[emotionMap[emotion]]
    }
    emit('apply', { type: 'custom', preset: '', custom: { size: { width: 192, height: 192 }, fileMap, emotionMap, images } })
    applied.value = true
  } catch (error) {
    console.error('载入开源表情失败:', error)
    errorMessage.value = error.message
  } finally {
    isApplying.value = false
  }
}
</script>
