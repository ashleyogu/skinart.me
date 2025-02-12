<script setup lang="ts">
import { ref, watch } from 'vue';
import JSZip from 'jszip';

/* ================================
   COMMON VARIABLES & FUNCTIONS
   ================================ */
const error = ref<string>('');
const showToast = ref(false);
watch(error, (newError) => {
  if (newError) {
    showToast.value = true;
    setTimeout(() => {
      showToast.value = false;
      error.value = '';
    }, 3000);
  }
});

// A helper sleep function (in ms)
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// The navigation state: either "generate" (to create skins) or "apply" (to upload and apply skins)
const activeTab = ref<'generate' | 'apply'>('generate');

/* ================================
   GENERATE SKINS TAB (LEFT SIDE)
   ================================ */

// For the skin art and base skin uploads
const artFile = ref<File | null>(null);
const baseSkinFile = ref<File | null>(null);
const artPreview = ref<string>('');
const basePreview = ref<string>('');

// Default black skin in base64 (used if no base skin is uploaded)
const defaultBaseSkin = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURQAAAAAAAKVnuc8AAAACdFJOU/8A5bcwSgAAAAlwSFlzAAAOwwAADsMBx2+oZAAAABh0RVh0U29mdHdhcmUAUGFpbnQuTkVUIDUuMS4xYrVSDAAAALZlWElmSUkqAAgAAAAFABoBBQABAAAASgAAABsBBQABAAAAUgAAACgBAwABAAAAAgAAADEBAgAQAAAAWgAAAGmHBAABAAAAagAAAAAAAABgAAAAAQAAAGAAAAABAAAAUGFpbnQuTkVUIDUuMS4xAAMAAJAHAAQAAAAwMjMwAaADAAEAAAABAAAABaAEAAEAAACUAAAAAAAAAAIAAQACAAQAAABSOTgAAgAHAAQAAAAwMTAwAAAAABt005TUCIYLAAAAb0lEQVRYR+3SMQrAMAxDUef+l65iPiE0Sx06Gb2hIFFrSgzEC/VCvVAPD/QYMJv2x5AvY0N9PBpi6jBwi3sPCLGOew8IsY77Hwbyg2yEuFAf/00dBm5x7wEh1nHvASHWcf/DQH6QjRA/5Q4DZiYRD89vA2HA6LX7AAAAAElFTkSuQmCC";

// Helper to create an image preview from a file
const createPreview = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  });
};

const handleArtFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    artFile.value = target.files[0];
    artPreview.value = await createPreview(target.files[0]);
  }
};

const handleBaseSkinFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    baseSkinFile.value = target.files[0];
    basePreview.value = await createPreview(target.files[0]);
  }
};

const dragOver = ref(false);
const baseDragOver = ref(false);

const handleDrop = async (event: DragEvent, type: 'art' | 'base') => {
  event.preventDefault();
  dragOver.value = false;
  baseDragOver.value = false;
  if (event.dataTransfer?.files.length) {
    const file = event.dataTransfer.files[0];
    if (type === 'art') {
      artFile.value = file;
      artPreview.value = await createPreview(file);
    } else {
      baseSkinFile.value = file;
      basePreview.value = await createPreview(file);
    }
  }
};

const handleDragOver = (event: DragEvent, type: 'art' | 'base') => {
  event.preventDefault();
  if (type === 'art') dragOver.value = true;
  else baseDragOver.value = true;
};

const handleDragLeave = (type: 'art' | 'base') => {
  if (type === 'art') dragOver.value = false;
  else baseDragOver.value = false;
};

const loadImage = (file: File | string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    if (typeof file === 'string') {
      img.src = file;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }
  });
};

const generateSkins = async () => {
  if (!artFile.value) {
    error.value = 'Please select a skin art file';
    return;
  }
  try {
    const artImage = await loadImage(artFile.value);
    if (artImage.width !== 72 || artImage.height !== 24) {
      error.value = 'Skin art must be 72x24 pixels';
      return;
    }
    let baseSkinImage: HTMLImageElement;
    if (baseSkinFile.value) {
      baseSkinImage = await loadImage(baseSkinFile.value);
      if (baseSkinImage.width !== 64 || baseSkinImage.height !== 64) {
        error.value = 'Base skin must be 64x64 pixels';
        return;
      }
    } else {
      baseSkinImage = await loadImage(defaultBaseSkin);
    }
    const zip = new JSZip();
    let i = 0;
    for (let y = 2; y >= 0; --y) {
      for (let x = 8; x >= 0; --x) {
        i++;
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        if (context) {
          context.drawImage(baseSkinImage, 0, 0);
          context.drawImage(artImage, x * 8, y * 8, 8, 8, 40, 8, 8, 8);
          const blob: Blob = await new Promise((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/png');
          });
          zip.file(`Skin-${i}.png`, blob);
        }
      }
    }
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'skinart.zip';
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    error.value = 'Error generating skins';
    console.error(err);
  }
};

/* ================================
   APPLY SKINS TAB (RIGHT SIDE)
   ================================ */

// In this view you upload a ZIP file (e.g. the one you just generated),
// enter your Bearer token (manually) and choose your skin style.
const zipFile = ref<File | null>(null);
const bearerToken = ref<string>('');
const skinStyle = ref<'slim' | 'classic'>('slim');

const handleZipFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    zipFile.value = target.files[0];
  }
};

const applySkins = async () => {
  if (!zipFile.value) {
    error.value = 'Please select a ZIP file containing skins';
    return;
  }
  if (!bearerToken.value) {
    error.value = 'Please enter your Bearer token';
    return;
  }
  try {
    const profileResponse = await fetch("/api/minecraft/profile", {
      headers: { "Authorization": "Bearer " + bearerToken.value }
    });
    if (!profileResponse.ok) {
      error.value = 'Error retrieving Minecraft profile. Check your Bearer token.';
      return;
    }
    const profileData = await profileResponse.json();
    const ign = profileData.name;
    if (!ign) {
      error.value = 'Could not retrieve username from profile';
      return;
    }
    const nameMCWindow = window.open(`https://namemc.com/profile/${ign.toLowerCase()}`, '_blank');
    const jszip = new JSZip();
    const zipContent = await jszip.loadAsync(zipFile.value);
    const skinFiles = Object.keys(zipContent.files)
      .filter(name => /^Skin-\d+\.png$/.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)![0]);
        const numB = parseInt(b.match(/\d+/)![0]);
        return numA - numB;
      });

    for (const skinName of skinFiles) {
      const file = zipContent.files[skinName];
      if (!file) continue;
      const blob = await file.async("blob");
      const formData = new FormData();
      formData.append("variant", skinStyle.value);
      formData.append("file", blob, skinName);

      let attempt = 0;
      let success = false;
      while (attempt < 3 && !success) {
      const res = await fetch("/api/minecraft/profile/skins", {
        method: "POST",
        headers: { "Authorization": "Bearer " + bearerToken.value },
        body: formData
      });
      if (res.ok) {
        success = true;
        console.log(`${skinName} applied successfully`);
      } else {
        attempt++;
        if (attempt >= 3) {
        error.value = `Error changing skin: ${skinName}`;
        console.error(`Error changing skin: ${skinName}`);
        } else {
        await sleep(3000);
        }
      }
      }

      await sleep(30000);
      window.open(`https://namemc.com/profile/${ign.toLowerCase()}`, '_blank');
      await sleep(15000);
    }
  } catch (err) {
    error.value = 'Error applying skins';
    console.error(err);
  }
};
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center p-4">
    <!-- Toast Notification -->
    <div v-if="showToast"
      class="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out">
      <div class="flex items-center space-x-2">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <nav class="mb-6">
      <button
        :class="{ 'bg-blue-600 text-white': activeTab === 'generate', 'bg-white text-blue-600': activeTab !== 'generate' }"
        class="px-4 py-2 border border-blue-600 rounded-l-lg" @click="activeTab = 'generate'">
        Generate Skins
      </button>
      <button
        :class="{ 'bg-blue-600 text-white': activeTab === 'apply', 'bg-white text-blue-600': activeTab !== 'apply' }"
        class="px-4 py-2 border-t border-b border-blue-600 rounded-r-lg" @click="activeTab = 'apply'">
        Apply Skins
      </button>
    </nav>

    <!-- Generate Skins View -->
    <div v-if="activeTab === 'generate'" class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800 mb-4">Minecraft Skin Art Generator</h1>
      </div>

      <div class="space-y-6">
        <!-- Skin Art Image Upload -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Skin Art Image (72x24px)
          </label>
          <div class="relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
            :class="[dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400']"
            @dragover="(e) => handleDragOver(e, 'art')" @dragleave="() => handleDragLeave('art')"
            @drop="(e) => handleDrop(e, 'art')" @click="$refs.artInput.click()">
            <input ref="artInput" type="file" accept="image/*" class="hidden" @change="handleArtFileChange" />
            <div v-if="!artPreview" class="space-y-2">
              <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <div class="text-sm text-gray-600">
                <span class="font-medium text-blue-600 hover:text-blue-500">
                  Click to upload
                </span>
                or drag and drop
              </div>
              <p class="text-xs text-gray-500">PNG or JPG (72x24px)</p>
            </div>
            <div v-else class="space-y-2">
              <img :src="artPreview" alt="Art Preview" class="mx-auto border border-gray-200 rounded"
                style="image-rendering: pixelated;" />
              <p class="text-sm text-gray-600">{{ artFile?.name }}</p>
              <button class="text-xs text-red-500 hover:text-red-600" @click.stop="artFile = null; artPreview = ''">
                Remove
              </button>
            </div>
          </div>
        </div>

        <!-- Base Skin Upload (Optional) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Base Skin (64x64px - Optional)
          </label>
          <div class="relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
            :class="[baseDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400']"
            @dragover="(e) => handleDragOver(e, 'base')" @dragleave="() => handleDragLeave('base')"
            @drop="(e) => handleDrop(e, 'base')" @click="$refs.baseInput.click()">
            <input ref="baseInput" type="file" accept="image/*" class="hidden" @change="handleBaseSkinFileChange" />
            <div v-if="!basePreview" class="space-y-1">
              <svg class="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <p class="text-xs text-gray-500">PNG or JPG (64x64px)</p>
            </div>
            <div v-else class="space-y-2">
              <img :src="basePreview" alt="Base Skin Preview" class="mx-auto border border-gray-200 rounded"
                style="image-rendering: pixelated;" />
              <p class="text-sm text-gray-600">{{ baseSkinFile?.name }}</p>
              <button class="text-xs text-red-500 hover:text-red-600"
                @click.stop="baseSkinFile = null; basePreview = ''">
                Remove
              </button>
            </div>
          </div>
        </div>

        <button @click="generateSkins"
          class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] font-medium">
          Generate Skins &amp; Download ZIP
        </button>

        <div class="mt-6 text-sm text-gray-500">
          <h3 class="font-medium text-gray-700 mb-2">How to use:</h3>
          <ol class="list-decimal list-inside space-y-1">
            <li>Upload your 72x24px skin art image</li>
            <li>Optionally upload a 64x64px base skin (a default black skin will be used if not provided)</li>
            <li>Click "Generate Skins &amp; Download ZIP" to generate your skins</li>
            <li>Use the downloaded ZIP to apply skins via the "Apply Skins" tab</li>
          </ol>
        </div>
      </div>
    </div>

    <!-- Apply Skins View -->
    <div v-if="activeTab === 'apply'" class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800 mb-4">Minecraft Skin Auto-Apply</h1>
        <p class="text-sm text-gray-600">
          Due to cross‐site restrictions automatic Bearer token retrieval isn’t allowed.
          Please enter your Bearer token manually.
        </p>
      </div>

      <div class="space-y-6">
        <!-- ZIP File Upload -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Upload ZIP File of Skins
          </label>
          <div class="relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors"
            @click="$refs.zipInput.click()">
            <input ref="zipInput" type="file" accept=".zip" class="hidden" @change="handleZipFileChange" />
            <div class="space-y-2">
              <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M8 12h32M8 24h32M8 36h32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <p class="text-sm text-gray-600">
                Click to upload or drag and drop a ZIP file containing your skins
              </p>
              <p class="text-xs text-gray-500">ZIP file containing Skin-1.png to Skin-N.png</p>
            </div>
          </div>
        </div>

        <!-- Bearer Token Input -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Bearer Token
          </label>
          <input type="text" v-model="bearerToken" placeholder="Enter your Bearer token"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <!-- Skin Style Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Skin Style
          </label>
          <select v-model="skinStyle"
            class="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="slim">Slim</option>
            <option value="classic">Classic</option>
          </select>
        </div>

        <button @click="applySkins"
          class="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] font-medium">
          Apply Skins
        </button>

        <div class="mt-6 text-sm text-gray-500">
          <h3 class="font-medium text-gray-700 mb-2">How to use:</h3>
          <ol class="list-decimal list-inside space-y-1">
            <li>Upload a ZIP file containing your generated skins (e.g., Skin-1.png, Skin-2.png, ...)</li>
            <li>Enter your Minecraft Bearer token (retrieved manually from minecraft.net)</li>
            <li>Select your skin style ("slim" or "classic")</li>
            <li>Click "Apply Skins" to automatically change your skin on Minecraft services</li>
            <li>Your NameMC profile will open in a new tab and refresh automatically between skin changes</li>
          </ol>
        </div>
      </div>
    </div>
  </div>
</template>
