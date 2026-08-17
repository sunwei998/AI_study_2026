<template>
  <div class="input-box">
    <div class="input-wrapper">
      <textarea
        v-model="inputText"
        :placeholder="placeholder"
        :disabled="isLoading"
        maxlength="4000"
        class="input-field"
        @keydown.enter="handleSubmit"
      ></textarea>
      <div class="input-actions">
        <button
          v-if="visionSupported"
          class="attach-btn"
          :disabled="isLoading"
          @click="fileInput?.click()"
          :title="$t('input.attachImage')"
        >
          📎
        </button>
        <button
          v-if="inputText.trim()"
          class="clear-btn"
          @click="inputText = ''"
          :title="$t('common.clear')"
        >
          ✕
        </button>
        <button
          v-if="isLoading"
          class="send-btn stop-btn"
          @click="$emit('stop')"
          :title="$t('common.stop')"
        >
          ■
        </button>
        <button
          v-else
          class="send-btn"
          :disabled="!canSend"
          @click="submit"
          :title="$t('common.send')"
        >
          📤
        </button>
      </div>
    </div>
    <div v-if="images.length" class="image-preview-area">
      <div v-for="(img, index) in images" :key="index" class="image-preview">
        <img :src="img" alt="" />
        <button class="remove-image" :title="$t('common.delete')" @click="removeImage(index)">
          ✕
        </button>
      </div>
    </div>
    <div class="input-footer">
      <span class="char-count">{{ inputText.length }} / 4000</span>
      <span class="tip">{{ $t('input.tip') }}</span>
    </div>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      hidden
      @change="handleFiles"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SendPayload } from '@/types/chat'
import { useChatStore } from '@/stores/chatStore'

const { t } = useI18n()

const store = useChatStore()

const props = defineProps<{
  isLoading: boolean
}>()

const emit = defineEmits<{
  send: [payload: SendPayload]
  stop: []
}>()

const MAX_IMAGES = 4
const MAX_IMAGE_SIZE_MB = 4
const MAX_IMAGE_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024

const inputText = ref('')
const images = ref<string[]>([])
const fileInput = ref<HTMLInputElement>()

const placeholder = computed(() => t('input.placeholder'))
const visionSupported = computed(() => Boolean(store.currentModelInfo?.vision))
const canSend = computed(() => inputText.value.trim() !== '' || images.value.length > 0)

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

const handleFiles = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  for (const file of files) {
    if (images.value.length >= MAX_IMAGES) {
      alert(t('chat.maxImages', { count: MAX_IMAGES }))
      break
    }
    if (file.size > MAX_IMAGE_SIZE) {
      alert(t('chat.imageTooLarge', { size: MAX_IMAGE_SIZE_MB }))
      continue
    }
    const url = await readFileAsDataURL(file)
    images.value.push(url)
  }
}

const removeImage = (index: number) => {
  images.value.splice(index, 1)
}

watch(visionSupported, (supported) => {
  if (!supported) {
    images.value = []
  }
})

const submit = () => {
  if (!canSend.value || props.isLoading) return
  emit('send', { content: inputText.value, images: images.value })
  inputText.value = ''
  images.value = []
}

const handleSubmit = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submit()
  }
}
</script>

<style scoped>
.input-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--color-border);
  background: var(--color-glass);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  animation: slideInUp 0.3s ease-out;
}

.input-wrapper {
  display: flex;
  gap: 8px;
  position: relative;
  padding: 6px;
  border-radius: var(--radius-lg);
  background: var(--color-glass);
  border: 1px solid var(--color-border);
  transition: var(--transition-normal);
}

.input-wrapper:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 16px var(--color-glow), inset 0 0 14px var(--color-glow);
}

.input-field {
  flex: 1;
  min-height: 44px;
  max-height: 150px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  border: none;
  background: transparent;
  color: var(--color-text);
  resize: vertical;
  font-family: var(--font-body);
  font-size: 14px;
  transition: var(--transition-normal);
}

.input-field:focus {
  outline: none;
  border-color: transparent;
  box-shadow: none;
}

.input-field:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.input-actions {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.clear-btn,
.send-btn,
.attach-btn {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  background: var(--color-glass);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  cursor: pointer;
  font-size: 18px;
  transition: var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.attach-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.image-preview-area {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0 4px;
}

.image-preview {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--color-border);
  box-shadow: 0 0 10px var(--color-glow);
  animation: slideInUp 0.2s ease-out;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.remove-image {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(10, 10, 20, 0.7);
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition-fast);
  border: 1px solid var(--color-border);
}

.remove-image:hover {
  background: #ff4d5e;
  border-color: #ff4d5e;
}

.clear-btn:hover {
  background: var(--color-border);
  color: var(--color-text-secondary);
  box-shadow: 0 0 10px var(--color-glow);
}

.send-btn {
  background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
  border-color: var(--color-primary);
  color: var(--color-background);
  font-weight: 600;
  box-shadow: 0 0 14px var(--color-glow);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 0 24px var(--color-glow);
}

.send-btn:active:not(:disabled) {
  transform: translateY(0);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stop-btn {
  background: var(--color-glass);
  border-color: #ff4d5e;
  color: #ff4d5e;
  box-shadow: 0 0 14px rgba(255, 77, 94, 0.35);
}

.stop-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 0 22px rgba(255, 77, 94, 0.5);
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--color-text-secondary);
  padding: 0 4px;
}

.char-count {
  font-family: var(--font-mono);
  opacity: 0.7;
}

.tip {
  font-family: var(--font-mono);
  opacity: 0.5;
}

@media (max-width: 768px) {
  .input-box {
    margin: 0 10px;
    padding: 10px 12px calc(10px + var(--safe-bottom, 0px));
    gap: 6px;
    border-radius: 18px;
  }

  .input-field {
    min-height: 40px;
    padding: 10px 12px;
    font-size: 13px;
  }

  .clear-btn,
  .send-btn,
  .attach-btn {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }

  .input-footer {
    font-size: 11px;
  }
}
</style>
