<script setup lang="ts">
import { ref, inject } from 'vue'
import JSZip from 'jszip'

const setError = inject<(msg: string) => void>('setError') ?? (() => {})

const artFile = ref<File | null>(null)
const baseSkinFile = ref<File | null>(null)
const artPreview = ref<string>('')
const basePreview = ref<string>('')

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
    if (artImage.width !== 72 || artImage.height !== 24) {
      setError('Skin art must be 72×24 px')
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
    for (let y = 2; y >= 0; y--) {
      for (let x = 8; x >= 0; x--) {
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
  <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-800 mb-4">Minecraft Skin Art Generator</h1>
    </div>
    <div class="space-y-6">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Skin Art Image (72×24px)
        </label>
        <div
          class="relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
          :class="[
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
          ]"
          @dragover="(e) => handleDragOver(e, 'art')"
          @dragleave="() => handleDragLeave('art')"
          @drop="(e) => handleDrop(e, 'art')"
          @click="$refs.artInput.click()"
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
              class="mx-auto h-12 w-12 text-gray-400"
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
            <div class="text-sm text-gray-600">
              <span class="font-medium text-blue-600 hover:text-blue-500"> Click to upload </span>
              or drag & drop
            </div>
            <p class="text-xs text-gray-500">PNG/JPG, 72×24 px</p>
          </div>
          <div v-else class="space-y-2">
            <img
              :src="artPreview"
              alt="Art Preview"
              class="mx-auto border border-gray-200 rounded"
              style="image-rendering: pixelated"
            />
            <p class="text-sm text-gray-600">{{ artFile?.name }}</p>
            <button
              class="text-xs text-red-500 hover:text-red-600"
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

      <!-- Base Skin Upload (Optional) -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Base Skin (64×64px, optional)
        </label>
        <div
          class="relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
          :class="[
            baseDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400',
          ]"
          @dragover="(e) => handleDragOver(e, 'base')"
          @dragleave="() => handleDragLeave('base')"
          @drop="(e) => handleDrop(e, 'base')"
          @click="$refs.baseInput.click()"
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
              class="mx-auto h-8 w-8 text-gray-400"
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
            <p class="text-xs text-gray-500">PNG/JPG, 64×64 px</p>
          </div>
          <div v-else class="space-y-2">
            <img
              :src="basePreview"
              alt="Base Skin Preview"
              class="mx-auto border border-gray-200 rounded"
              style="image-rendering: pixelated"
            />
            <p class="text-sm text-gray-600">{{ baseSkinFile?.name }}</p>
            <button
              class="text-xs text-red-500 hover:text-red-600"
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

      <button
        @click="generateSkins"
        class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] font-medium"
      >
        Generate Skins &amp; Download ZIP
      </button>

      <div class="mt-6 text-sm text-gray-500">
        <h3 class="font-medium text-gray-700 mb-2">Instructions:</h3>
        <ol class="list-decimal list-inside space-y-1">
          <li>Upload a 72×24 skin art image.</li>
          <li>Optionally upload a 64×64 base skin. (Default black used if omitted)</li>
          <li>Click “Generate Skins” to download a zip of 27 Skin-X files.</li>
          <li>Then switch over to the “Apply Skins” tab.</li>
        </ol>
      </div>
    </div>
  </div>
</template>
