<script setup lang="ts">
import { ref, onMounted, inject } from 'vue'
import JSZip from 'jszip'

const setError = inject<(msg: string) => void>('setError') ?? (() => {})
const zipFile = ref<File | null>(null)
const bearerToken = ref<string>('')
const skinStyle = ref<'slim' | 'classic'>('slim')
const totalSkinsCount = ref<number>(0)
const uploadedCount = ref<number>(0)
const headPreviews = ref<string[]>([])
const failedSkinsKey = 'failedSkinsList'

onMounted(() => {
  const stored = localStorage.getItem(failedSkinsKey)
  if (stored) {
    const failList: { name: string; data: string }[] = JSON.parse(stored)
    for (const item of failList) {
      headPreviews.value.push(item.data)
    }
  }
})

function handleZipFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.files?.length) {
    zipFile.value = target.files[0]
  }
}

/**
 * Extracts an 8×8 “head front” region from x=40..47, y=8..15,
 * and returns a dataURL for display.
 */
async function createHeadPreview(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      if (!e.target?.result) {
        reject()
        return
      }
      const image = new Image()
      image.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 8
        canvas.height = 8
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject()
          return
        }
        ctx.drawImage(image, 40, 8, 8, 8, 0, 0, 8, 8)
        resolve(canvas.toDataURL('image/png'))
      }
      image.onerror = reject
      image.src = e.target.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Helper sleep function
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function applySkins() {
  if (!zipFile.value) {
    setError('Please select a ZIP file containing skins')
    return
  }
  if (!bearerToken.value) {
    setError('Please enter your Bearer token')
    return
  }

  try {
    await tryReuploadFailedSkins()

    const profileResponse = await fetch('/api/minecraft/profile', {
      headers: { Authorization: 'Bearer ' + bearerToken.value },
    })
    if (!profileResponse.ok) {
      setError('Error retrieving Minecraft profile. Check your Bearer token.')
      return
    }
    const profileData = await profileResponse.json()
    const ign = profileData.name
    if (!ign) {
      setError('Could not retrieve username from profile')
      return
    }

    const jszip = new JSZip()
    const zipContent = await jszip.loadAsync(zipFile.value)
    const skinFiles = Object.keys(zipContent.files)
      .filter((name) => /^Skin-\d+\.png$/.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)![0])
        const numB = parseInt(b.match(/\d+/)![0])
        return numA - numB
      })

    // 4. Initialize progress tracking
    totalSkinsCount.value = skinFiles.length
    uploadedCount.value = 0

    // 5. Loop through and apply each skin
    for (const skinName of skinFiles) {
      console.log(`Uploading skin: ${skinName}`)
      const file = zipContent.files[skinName]
      if (!file) continue

      const blob = await file.async('blob')
      const formData = new FormData()
      formData.append('variant', skinStyle.value)
      formData.append('file', blob, skinName)

      let attempt = 0
      let success = false
      while (attempt < 3 && !success) {
        const res = await fetch('/api/minecraft/profile/skins', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + bearerToken.value },
          body: formData,
        })
        if (res.ok) {
          success = true
          console.log(`${skinName} applied successfully`)
        } else {
          attempt++
          console.warn(`Attempt ${attempt} failed for ${skinName}`)
          if (attempt < 3) await sleep(3000)
        }
      }

      if (!success) {
        addFailedSkinToLocalStorage(skinName, blob)
        setError(`Error changing skin: ${skinName} (saved for later retry)`)
        console.error(`Error changing skin: ${skinName}`)
      } else {
        const headDataUrl = await createHeadPreview(blob)
        headPreviews.value.push(headDataUrl)
      }

      uploadedCount.value++
      // 30-second cooldown
      await sleep(30000)
      // Open NameMC profile in a new window and then close it after a few seconds
      const newWindow = window.open(
        `https://namemc.com/profile/${ign.toLowerCase()}`,
        '_blank',
        'width=320,height=240,location=no,menubar=no,status=no,toolbar=no',
      )
      if (newWindow) {
        setTimeout(() => {
          newWindow.close()
        }, 7000)
      }
      // 15-second wait before next upload
      await sleep(15000)
    }
  } catch (err) {
    setError('Error applying skins')
    console.error(err)
  }
}

/**
 * Adds a failed skin entry to localStorage for later retry.
 */
function addFailedSkinToLocalStorage(skinName: string, blob: Blob) {
  const reader = new FileReader()
  reader.onload = () => {
    const base64 = reader.result as string
    const stored = localStorage.getItem(failedSkinsKey)
    const failList: { name: string; data: string }[] = stored ? JSON.parse(stored) : []
    failList.push({ name: skinName, data: base64 })
    localStorage.setItem(failedSkinsKey, JSON.stringify(failList))
  }
  reader.readAsDataURL(blob)
}

/**
 * Tries reuploading any skins that previously failed.
 */
async function tryReuploadFailedSkins() {
  const stored = localStorage.getItem(failedSkinsKey)
  if (!stored) return

  const failList: { name: string; data: string }[] = JSON.parse(stored)
  if (!failList.length) return

  console.log('Re‐uploading previously failed skins...')
  const newFailList: { name: string; data: string }[] = []

  for (const item of failList) {
    console.log(`Reattempting: ${item.name}`)
    const blobRes = await fetch(item.data)
    const blob = await blobRes.blob()
    const formData = new FormData()
    formData.append('variant', skinStyle.value)
    formData.append('file', blob, item.name)

    let attempt = 0
    let success = false
    while (attempt < 3 && !success) {
      const res = await fetch('/api/minecraft/profile/skins', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + bearerToken.value },
        body: formData,
      })
      if (res.ok) {
        success = true
        console.log(`Failed skin ${item.name} reuploaded successfully`)
        const headDataUrl = await createHeadPreview(blob)
        headPreviews.value.push(headDataUrl)
      } else {
        attempt++
        console.warn(`Reattempt ${attempt} failed for ${item.name}`)
        if (attempt < 3) await sleep(3000)
      }
    }

    if (!success) {
      newFailList.push(item)
    }
  }

  if (newFailList.length) {
    localStorage.setItem(failedSkinsKey, JSON.stringify(newFailList))
  } else {
    localStorage.removeItem(failedSkinsKey)
  }
}

async function clearFailedSkins() {
  localStorage.removeItem(failedSkinsKey)
  headPreviews.value = []
}
</script>

<template>
  <div class="bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-2xl border border-gray-700">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-white mb-4">Minecraft Skin Auto-Apply</h1>
      <p class="text-sm text-gray-400">
        Enter your Bearer token manually. The script cycles through each skin, waits between
        uploads, and auto‐refreshes your NameMC page to confirm changes.
      </p>
    </div>

    <div class="space-y-6">
      <!-- ZIP File Upload -->
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">ZIP File of Skins</label>
        <div
          class="relative border-2 border-dashed border-gray-600 hover:border-gray-500 rounded-lg p-8 text-center cursor-pointer transition-colors"
          @click="$refs.zipInput.click()"
        >
          <input
            ref="zipInput"
            type="file"
            accept=".zip"
            class="hidden"
            @change="handleZipFileChange"
          />
          <div class="space-y-2">
            <svg
              class="mx-auto h-12 w-12 text-gray-500"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
                <path
                d="M44 24V9a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v30a3 3 0 0 0 3 3h34a3 3 0 0 0 3-3V24zM7 6h34M15 6v36M23 6v36"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                />
                <path
                d="M15 14h8v4h-8v-4zm0 8h8v4h-8v-4zm0 8h8v4h-8v-4z"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                />
            </svg>
            <p class="text-sm text-gray-400">Click to upload a ZIP</p>
            <p class="text-xs text-gray-500">ZIP must have Skin-1.png, Skin-2.png, etc.</p>
          </div>
        </div>
      </div>

      <!-- Bearer Token -->
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">Bearer Token<a href="https://bearer.wiki/#obtain" target="_blank" class="text-xs text-gray-500 mb-2 block">(What is a Bearer token? & How to get it?)</a></label>
        <input
          type="text"
          v-model="bearerToken"
          placeholder="Paste Bearer token"
          class="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
        />
      </div>

      <!-- Skin Style -->
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">Skin Style</label>
        <select
          v-model="skinStyle"
          class="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="slim">Slim</option>
          <option value="classic">Classic</option>
        </select>
      </div>

      <!-- Apply and Clear Buttons -->
      <div class="flex gap-4">
        <button
          @click="applySkins"
          class="flex-1 bg-purple-500 text-white py-3 px-4 rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all transform hover:scale-[1.02] active:scale-[0.98] font-medium"
        >
          Apply Skins
        </button>
        <button
          @click="clearFailedSkins"
          class="flex-1 bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-all transform hover:scale-[1.02] active:scale-[0.98] font-medium"
        >
          Clear Failed Skins
        </button>
      </div>

      <!-- Progress Bar -->
      <div v-if="totalSkinsCount" class="mt-4">
        <p class="text-sm text-gray-400 mb-1">
          Upload progress: {{ uploadedCount }}/{{ totalSkinsCount }}
        </p>
        <div class="w-full bg-gray-700 h-4 rounded-full">
          <div
            class="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all"
            :style="{ width: (uploadedCount / totalSkinsCount) * 100 + '%' }"
          ></div>
        </div>
      </div>

      <div v-if="headPreviews.length" class="mt-6">
        <h3 class="font-medium text-gray-300 mb-2 text-sm">Uploaded Heads</h3>
        <div class="flex flex-wrap w-[288px] bg-gray-900/50 p-2 rounded-lg">
          <div
            v-for="(head, index) in [...headPreviews].reverse()"
            :key="index"
            class="w-8 h-8 flex-shrink-0"
          >
            <img
              :src="head"
              class="w-8 h-8"
              style="image-rendering: pixelated"
              alt="Head preview"
            />
          </div>
        </div>
      </div>

      <div class="mt-6 text-sm text-gray-400">
        <h3 class="font-medium text-gray-300 mb-2">Instructions:</h3>
        <ol class="list-decimal list-inside space-y-1">
          <li>Pick the ZIP you generated on the left tab.</li>
          <li>Enter your Bearer token from your Minecraft session.</li>
          <li>Choose Slim or Classic, then click "Apply Skins."</li>
          <li>
            Skins are uploaded, NameMC is refreshed between each upload. The grid below shows each
            new "head."
          </li>
          <li>Any failed skins will be reattempted next time you click "Apply Skins."</li>
        </ol>
      </div>
    </div>
  </div>
</template>
