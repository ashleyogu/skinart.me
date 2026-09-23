<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import JSZip from 'jszip'

const setError = inject<(msg: string) => void>('setError') ?? (() => {})

const artFile = ref<File | null>(null)
const baseSkinFile = ref<File | null>(null)
const artPreview = ref<string>('')
const basePreview = ref<string>('')
const artInput = ref<HTMLInputElement | null>(null)
const baseInput = ref<HTMLInputElement | null>(null)
const mode = ref<'namemc' | 'laby'>('namemc')

const modeConfig = computed(() =>
  mode.value === 'namemc'
    ? { label: 'NameMC', width: 72, height: 24, columns: 9, rows: 3 }
    : { label: 'Laby', width: 40, height: 32, columns: 5, rows: 4 },
)

const defaultBaseSkin = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURQAAAAAAAKVnuc8AAAACdFJOU/8A5bcwSgAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABh0RVh0U29mdHdhcmUAUGFpbnQuTkVUIDUuMS4xYrVSDAAAALZlWElmSUkqAAgAAAAFABoBBQABAAAASgAAABsBBQABAAAAUgAAACgBAwABAAAAAgAAADEBAgAQAAAAWgAAAGmHBAABAAAAagAAAAAAAABgAAAAAQAAAGAAAAABAAAAUGFpbnQuTkVUIDUuMS4xAAMAAJAHAAQAAAAwMjMwAaADAAEAAAABAAAABaAEAAEAAACUAAAAAAAAAAIAAQACAAQAAABSOTgAAgAHAAQAAAAwMTAwAAAAABt005TUCIYLAAAAb0lEQVRYR+3SMQrAMAxDUef+l65iPiE0Sx06Gb2hIFFrSgzEC/VCvVAPD/QYMJv2x5AvY0N9PBpi6jBwi3sPCLGOew8IsY77Hwbyg2yEuFAf/00dBm5x7wEh1nHvASHWcf/DQH6QjRA/5Q4DZiYRD89vA2HA6LX7AAAAAElFTkSuQmCC";

// Creates dataURL preview from a File
function createPreview(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.readAsDataURL(file)
  })
}

async function handleArtFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) {
    artFile.value = target.files[0]
    artPreview.value = await createPreview(target.files[0])
  }
}

async function handleBaseSkinFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) {
    baseSkinFile.value = target.files[0]
    basePreview.value = await createPreview(target.files[0])
  }
}

const dragOver = ref(false)
const baseDragOver = ref(false)

async function handleDrop(e: DragEvent, type: 'art' | 'base') {
  e.preventDefault()
  dragOver.value = false
  baseDragOver.value = false
  if (e.dataTransfer?.files.length) {
    const file = e.dataTransfer.files[0]
    if (type === 'art') {
      artFile.value = file
      artPreview.value = await createPreview(file)
    } else {
      baseSkinFile.value = file
      basePreview.value = await createPreview(file)
    }
  }
}

function handleDragOver(e: DragEvent, type: 'art' | 'base') {
  e.preventDefault()
  if (type === 'art') dragOver.value = true
  else baseDragOver.value = true
}

function handleDragLeave(type: 'art' | 'base') {
  if (type === 'art') dragOver.value = false
  else baseDragOver.value = false
}

function loadImage(file: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    if (typeof file === 'string') {
      img.src = file
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    }
  })
}

async function generateSkins() {
  if (!artFile.value) {
    setError('Please select a skin art file')
    return
  }
  try {
    const artImage = await loadImage(artFile.value)
    if (artImage.width !== modeConfig.value.width || artImage.height !== modeConfig.value.height) {
      setError(`${modeConfig.value.label} art must be ${modeConfig.value.width}×${modeConfig.value.height} px`)
      return
    }
    let baseSkinImage: HTMLImageElement
    if (baseSkinFile.value) {
      baseSkinImage = await loadImage(baseSkinFile.value)
      if (baseSkinImage.width !== 64 || baseSkinImage.height !== 64) {
        setError('Base skin must be 64×64 px')
        return
      }
    } else {
      baseSkinImage = await loadImage(defaultBaseSkin)
    }

    const zip = new JSZip()
    let i = 0
    for (let y = modeConfig.value.rows - 1; y >= 0; y--) {
      for (let x = modeConfig.value.columns - 1; x >= 0; x--) {
        i++
        const canvas = document.createElement('canvas')
        canvas.width = 64
        canvas.height = 64
        const context = canvas.getContext('2d')
        if (!context) continue

        context.drawImage(baseSkinImage, 0, 0)
        context.drawImage(artImage, x * 8, y * 8, 8, 8, 40, 8, 8, 8)

        const blob: Blob = await new Promise((resolve) =>
          canvas.toBlob((b) => resolve(b!), 'image/png'),
        )
        zip.file(`Skin-${i}.png`, blob)
      }
    }

    // The original skin belongs at the end of the upload order.
    if (baseSkinFile.value) {
      const baseCanvas = document.createElement('canvas')
      baseCanvas.width = 64
      baseCanvas.height = 64
      const baseContext = baseCanvas.getContext('2d')
      if (baseContext) {
        baseContext.drawImage(baseSkinImage, 0, 0)
        const baseBlob: Blob = await new Promise((resolve) =>
          baseCanvas.toBlob((b) => resolve(b!), 'image/png'),
        )
        zip.file(`Skin-${i + 1}.png`, baseBlob)
      }
    }

    const content = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(content)
    const link = document.createElement('a')
    link.href = url
    link.download = 'skinart.zip'
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    setError('Error generating skins')
    console.error(err)
  }
}
</script>

<template>
  <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
    <section class="flex flex-col border border-white/12 bg-[#111111] p-5 shadow-2xl sm:p-8">
      <div class="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="mb-2 text-xs uppercase tracking-[0.22em] text-white/40">01 / Build</p>
          <h2 class="text-2xl font-semibold tracking-[-0.03em]">Process your skinart</h2>
        </div>
        <div class="grid grid-cols-2 border border-white/15 p-1 text-xs font-semibold uppercase tracking-[0.12em]">
          <button class="px-3 py-2 transition" :class="mode === 'namemc' ? 'bg-white text-black' : 'text-white/50 hover:text-white'" @click="mode = 'namemc'">NameMC</button>
          <button class="px-3 py-2 transition" :class="mode === 'laby' ? 'bg-white text-black' : 'text-white/50 hover:text-white'" @click="mode = 'laby'">Laby</button>
        </div>
      </div>
      <div class="mb-7 flex items-center justify-between text-sm text-white/55">
        <span>{{ modeConfig.label }} canvas</span>
        <strong class="font-mono text-white">{{ modeConfig.width }} × {{ modeConfig.height }} px</strong>
      </div>
      <div class="flex flex-1 flex-col space-y-7">
      <div>
        <label class="mb-2 block text-sm font-medium text-white">Skin art sheet</label>
        <div
          class="relative cursor-pointer border border-dashed border-white/20 p-8 text-center transition-colors hover:border-white/60"
          :class="[
            dragOver ? 'border-white bg-white/5' : '',
          ]"
          @dragover="(e) => handleDragOver(e, 'art')"
          @dragleave="() => handleDragLeave('art')"
          @drop="(e) => handleDrop(e, 'art')"
          @click="artInput?.click()"
        >
          <input
            ref="artInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleArtFileChange"
          />
          <div v-if="!artPreview" class="space-y-2">
            <svg
              class="mx-auto h-12 w-12 text-gray-500"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <div class="text-sm text-gray-400">
              <span class="font-medium text-purple-400 hover:text-purple-300">Choose a PNG</span>
              or drag it here
            </div>
            <p class="text-xs text-gray-500">Your skinart · {{ modeConfig.width }}×{{ modeConfig.height }} px </p>
          </div>
          <div v-else class="space-y-2">
            <img
              :src="artPreview"
              alt="Art Preview"
              class="mx-auto border border-white/15 bg-black"
              style="image-rendering: pixelated"
            />
            <p class="text-sm text-gray-400">{{ artFile?.name }}</p>
            <button
              class="text-xs text-white/50 underline hover:text-white"
              @click.stop="
                () => {
                  artFile = null
                  artPreview = ''
                }
              "
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">
          Optional final skin
        </label>
        <div
          class="relative cursor-pointer border border-dashed border-white/20 p-6 text-center transition-colors hover:border-white/60"
          :class="[
            baseDragOver ? 'border-white bg-white/5' : '',
          ]"
          @dragover="(e) => handleDragOver(e, 'base')"
          @dragleave="() => handleDragLeave('base')"
          @drop="(e) => handleDrop(e, 'base')"
          @click="baseInput?.click()"
        >
          <input
            ref="baseInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleBaseSkinFileChange"
          />
          <div v-if="!basePreview" class="space-y-1">
            <svg
              class="mx-auto h-8 w-8 text-gray-500"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <p class="text-xs text-gray-500">Your Minecraft skin · 64×64 px</p>
          </div>
          <div v-else class="space-y-2">
            <img
              :src="basePreview"
              alt="Base Skin Preview"
              class="mx-auto border border-white/15 bg-black"
              style="image-rendering: pixelated"
            />
            <p class="text-sm text-gray-400">{{ baseSkinFile?.name }}</p>
            <button
              class="text-xs text-white/50 underline hover:text-white"
              @click.stop="
                () => {
                  baseSkinFile = null
                  basePreview = ''
                }
              "
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      </div>
      <button
        @click="generateSkins"
        class="mt-3 w-full bg-white px-4 py-3 font-semibold text-black transition hover:bg-white/80 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#111111]"
      >
        Generate .zip file for {{ modeConfig.label }}
      </button>
    </section>

    <aside id="guide" class="border border-white/12 bg-[#111111] p-5 sm:p-7">
      <p class="mb-2 text-xs uppercase tracking-[0.22em] text-white/40">02 / Guide</p>
      <h2 class="mb-3 text-2xl font-semibold tracking-[-0.03em]">How to process your skinart</h2>
      <p class="mb-6 text-sm leading-6 text-white/50">

      </p>
      <ol class="space-y-5 text-sm leading-6 text-white/60">
        <li><strong class="mr-2 text-white">01</strong> Select <span class="text-white">NameMC</span> or <span class="text-white">Laby</span>.</li>
        <li><strong class="mr-2 text-white">02</strong> Create a skinart that is <span class="text-white">{{ modeConfig.width }} × {{ modeConfig.height }} px</span>.</li>
        <li><strong class="mr-2 text-white">03</strong> Upload your skinart, then add a 64×64 Minecraft skin if you want a personal skin at the end.</li>
        <li><strong class="mr-2 text-white">04</strong> Generate the ZIP and upload the numbered files to your profile in order.</li>
        <li><strong class="mr-2 text-white">05</strong> Wait for each skin to appear on your <span class="text-white">{{ modeConfig.label }}</span> page.</li>
      </ol>
      <div class="mt-8 border-t border-white/10 pt-5 text-xs leading-5 text-white/35">
        The optional final skin is exported after the art tiles. If you leave it out, the set simply contains the art tiles.
      </div>
    </aside>
  </div>
</template>
