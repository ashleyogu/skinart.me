<script setup lang="ts">
import { ref, watch, provide } from 'vue'
import GenerateSkins from './components/GenerateSkins.vue'

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
  <div class="min-h-screen bg-[#090909] px-3 py-5 text-white sm:px-6 sm:py-8">
    <div
      v-if="showToast"
      class="fixed right-4 top-4 z-10 flex max-w-sm items-center gap-3 border border-white/15 bg-white px-5 py-3 text-sm font-medium text-black shadow-2xl"
    >
      <span class="flex h-5 w-5 items-center justify-center border border-black text-xs">!</span>
      <span>{{ error }}</span>
    </div>

    <div class="mx-auto w-full max-w-[1100px]">
      <header class="mx-auto mb-6 flex w-full items-center justify-between gap-3 px-2 sm:px-4">
        <div class="flex items-center gap-3">
          <img src="/favicon.png" alt="" class="h-7 w-7 object-contain" />
          <span class="text-sm font-semibold tracking-[0.12em] text-white">skinart.me</span>
        </div>
        <nav class="flex items-center gap-5 text-white/45">
          <a
            class="transition hover:text-white"
            href="https://github.com/ashleyogu/skinart.me"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open skinart.me on GitHub"
            title="GitHub"
          >
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.588 2 12.253c0 4.534 2.865 8.378 6.839 9.735.5.096.682-.222.682-.493 0-.243-.009-.888-.014-1.744-2.782.62-3.369-1.376-3.369-1.376-.455-1.188-1.11-1.505-1.11-1.505-.908-.637.069-.624.069-.624 1.004.073 1.533 1.056 1.533 1.056.892 1.568 2.341 1.115 2.912.852.091-.663.349-1.115.635-1.371-2.221-.26-4.555-1.14-4.555-5.073 0-1.121.39-2.037 1.03-2.755-.103-.26-.446-1.305.098-2.72 0 0 .84-.275 2.75 1.052A9.185 9.185 0 0 1 12 8.45a9.12 9.12 0 0 1 2.503.35c1.91-1.327 2.748-1.052 2.748-1.052.546 1.415.203 2.46.1 2.72.64.718 1.028 1.634 1.028 2.755 0 3.943-2.338 4.81-4.566 5.065.359.318.678.946.678 1.907 0 1.376-.012 2.485-.012 2.823 0 .274.18.594.688.492C19.14 20.627 22 16.783 22 12.253 22 6.588 17.523 2 12 2Z" />
            </svg>
          </a>
          <a
            class="transition hover:text-white"
            href="https://discord.gg/MqpQnm2k5V"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open Discord"
            title="Discord"
          >
            <svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19.54 5.18A16.9 16.9 0 0 0 15.4 3.9l-.5 1.02a15.4 15.4 0 0 0-5.8 0L8.6 3.9a16.95 16.95 0 0 0-4.15 1.29C1.82 9.08 1.1 12.88 1.46 16.63a16.75 16.75 0 0 0 5.1 2.58l1.23-1.7c-.67-.25-1.3-.56-1.9-.92l.46-.35c3.66 1.7 7.63 1.7 11.24 0l.47.35c-.6.36-1.24.67-1.91.92l1.23 1.7a16.8 16.8 0 0 0 5.1-2.58c.43-4.35-.73-8.11-2.94-11.45ZM8.73 15.02c-1.1 0-2-.99-2-2.2s.88-2.2 2-2.2c1.12 0 2.02.99 2 2.2 0 1.21-.88 2.2-2 2.2Zm6.54 0c-1.1 0-2-.99-2-2.2s.88-2.2 2-2.2c1.12 0 2.02.99 2 2.2 0 1.21-.88 2.2-2 2.2Z" />
            </svg>
          </a>
        </nav>
      </header>

      <GenerateSkins />
    </div>
  </div>
</template>
