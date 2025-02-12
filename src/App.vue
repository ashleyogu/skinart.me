<script setup lang="ts">
import { ref, watch, provide } from 'vue'
import GenerateSkins from './components/GenerateSkins.vue'
import ApplySkins from './components/ApplySkins.vue'

const activeTab = ref<'generate' | 'apply'>('generate')
const error = ref<string>('')
const showToast = ref(false)

function setError(msg: string) {
  error.value = msg
}

watch(error, (newError) => {
  if (newError) {
    showToast.value = true
    setTimeout(() => {
      showToast.value = false
      error.value = ''
    }, 3000)
  }
})

provide('setError', setError)
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-gray-900 to-purple-900 flex flex-col items-center p-4"
  >
    <!-- Toast Notification -->
    <div
      v-if="showToast"
      class="fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ease-in-out"
    >
      <div class="flex items-center space-x-2">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{{ error }}</span>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="inline-flex shadow-lg rounded-lg mb-8 bg-gray-800 p-1 border border-purple-500/30">
      <button
        @click="activeTab = 'generate'"
        :class="[
          'px-6 py-2.5 rounded-lg font-medium transition-all duration-200',
          activeTab === 'generate'
            ? 'bg-purple-600 text-white shadow-sm'
            : 'text-gray-300 hover:bg-gray-700',
        ]"
      >
        Generate Skins
      </button>
      <button
        @click="activeTab = 'apply'"
        :class="[
          'px-6 py-2.5 rounded-lg font-medium transition-all duration-200',
          activeTab === 'apply'
            ? 'bg-purple-600 text-white shadow-sm'
            : 'text-gray-300 hover:bg-gray-700',
        ]"
      >
        Apply Skins
      </button>
    </div>

    <GenerateSkins v-if="activeTab === 'generate'" />
    <ApplySkins v-else />
  </div>

  <!-- Footer -->
  <footer class="fixed bottom-0 left-0 text-gray-300/50 text-left p-4">
    <p class="flex items-center gap-2">
      Made with 💜 by
      <span class="flex items-center gap-2">
        <img
          src="/mikka.jpg"
          alt="Mikka's profile"
          class="w-4 h-4 rounded-full"
        />
        <a
          class="text-purple-500 hover:underline"
          href="https://github.com/cvyl"
          target="_blank"
          rel="noopener noreferrer"
        >
          Mikka (cvyl)
        </a>
      </span>
    </p>
    <p class="flex items-center gap-2">
      &copy; 2025
      <span class="flex items-center gap-2">
        <img
          src="/ashley.jpg"
          alt="Ashley's profile"
          class="w-4 h-4 rounded-full"
        />
        <a
          class="text-purple-500 hover:underline"
          href="https://catmaid.coffee/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Ashley Watson
        </a>
        <a
          class="text-purple-500 hover:underline"
          href="https://github.com/ashleyogu/skinart.me"
          target="_blank"
          rel="noopener noreferrer"
        >
          (Source Code)
        </a>
      </span>
    </p>
  </footer>
</template>
