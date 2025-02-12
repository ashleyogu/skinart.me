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

// Provide the setError function to child components
provide('setError', setError)
</script>

<template>
  <div
    class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center p-4"
  >
    <!-- Toast Notification -->
    <div
      v-if="showToast"
      class="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ease-in-out"
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
    <div class="inline-flex shadow-sm rounded-lg mb-8 bg-white p-1">
      <button
        @click="activeTab = 'generate'"
        :class="[
          'px-6 py-2.5 rounded-lg font-medium transition-all duration-200',
          activeTab === 'generate'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100',
        ]"
      >
        Generate Skins
      </button>
      <button
        @click="activeTab = 'apply'"
        :class="[
          'px-6 py-2.5 rounded-lg font-medium transition-all duration-200',
          activeTab === 'apply'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100',
        ]"
      >
        Apply Skins
      </button>
    </div>

    <!-- Conditionally render components -->
    <GenerateSkins v-if="activeTab === 'generate'" />
    <ApplySkins v-else />
  </div>
</template>
