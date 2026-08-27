<template>
  <div class="app-import">
    <div
      class="app-import__dropzone"
      :class="{ 'is-dragover': dragover, 'is-disabled': disabled }"
      role="button"
      tabindex="0"
      :aria-label="title || $t('common.import')"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
      @click="openPicker"
      @keydown.enter.prevent="openPicker"
    >
      <div class="app-import__icon">
        <AppIcon name="lucide:upload-cloud" :size="40" />
      </div>
      <p class="app-import__title">{{ title || $t('common.importDropTitle') }}</p>
      <p class="app-import__hint">{{ hint || $t('common.importDropHint') }}</p>
      <input
        ref="fileRef"
        type="file"
        class="app-import__input"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled"
        @change="onPick"
      />
    </div>

    <ul v-if="files.length" class="app-import__list">
      <li v-for="f in files" :key="f.name + f.size" class="app-import__item">
        <AppIcon name="lucide:file" :size="14" />
        <span class="app-import__name">{{ f.name }}</span>
        <span class="app-import__size">{{ formatFileSize(f.size) }}</span>
        <button class="app-import__remove" :title="$t('common.remove')" @click="remove(f)">
          <AppIcon name="lucide:x" :size="13" />
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '@/components/common/AppIcon.vue'
import { useToast } from '@/composables/useToast'
import { formatFileSize } from '@/utils/download'

const props = withDefaults(
  defineProps<{
    title?: string
    hint?: string
    accept?: string
    multiple?: boolean
    disabled?: boolean
    maxSize?: number
  }>(),
  {
    title: '',
    hint: '',
    accept: '',
    multiple: false,
    disabled: false,
    maxSize: 0
  }
)

const emit = defineEmits<{ (e: 'import', files: File[]): void; (e: 'change', files: File[]): void }>()

const { t } = useI18n()
const { showToast } = useToast()

const dragover = ref(false)
const files = ref<File[]>([])
const fileRef = ref<HTMLInputElement | null>(null)

function validate(file: File): boolean {
  if (props.accept && !props.accept.split(',').some((a) => {
    const ext = a.trim().replace(/^\*\./, '').toLowerCase()
    return file.name.toLowerCase().endsWith(ext) || a.trim().startsWith(file.type.split('/')[0] + '/')
  })) {
    showToast(t('common.importTypeMismatch'), 'error')
    return false
  }
  if (props.maxSize > 0 && file.size > props.maxSize) {
    showToast(t('common.importTooLarge'), 'error')
    return false
  }
  return true
}

function acceptFiles(list: FileList | null) {
  if (!list) return
  const valid: File[] = []
  for (const f of Array.from(list)) {
    if (validate(f)) valid.push(f)
  }
  if (!valid.length) return
  files.value = props.multiple ? [...files.value, ...valid] : valid
  emit('import', valid)
  emit('change', files.value)
}

function onDragOver() {
  if (props.disabled) return
  dragover.value = true
}

function onDragLeave() {
  dragover.value = false
}

function onDrop(e: DragEvent) {
  dragover.value = false
  if (props.disabled) return
  acceptFiles(e.dataTransfer?.files ?? null)
}

function openPicker() {
  if (props.disabled) return
  fileRef.value?.click()
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  acceptFiles(input.files)
  input.value = ''
}

function remove(f: File) {
  files.value = files.value.filter((x) => x !== f)
  emit('change', files.value)
}

function clear() {
  files.value = []
  emit('change', [])
}

defineExpose({ files, clear })
</script>

<style scoped>
.app-import {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.app-import__dropzone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 20px;
  border-radius: var(--radius-lg);
  border: 1.5px dashed color-mix(in srgb, var(--color-border) 80%, transparent);
  background:
    linear-gradient(120deg, var(--glass-sheen) 0%, transparent 45%, var(--glass-sheen) 100%),
    var(--color-glass);
  backdrop-filter: blur(16px) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(16px) saturate(var(--glass-saturate));
  cursor: pointer;
  transition: var(--transition-normal);
  text-align: center;
  user-select: none;
}

.app-import__dropzone:hover,
.app-import__dropzone.is-dragover {
  border-color: var(--color-primary);
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--color-primary) 40%, transparent),
    0 8px 30px var(--color-glow),
    inset 0 0 24px color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.app-import__dropzone.is-dragover {
  transform: scale(1.01);
}

.app-import__dropzone.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.app-import__icon {
  color: var(--color-primary);
  filter: drop-shadow(0 0 10px var(--color-glow));
}

.app-import__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: 14px;
  letter-spacing: 0.06em;
  color: var(--color-text);
}

.app-import__hint {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-secondary);
  opacity: 0.8;
}

.app-import__input {
  display: none;
}

.app-import__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
}

.app-import__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: 13px;
  color: var(--color-text);
}

.app-import__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-import__size {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--color-text-secondary);
}

.app-import__remove {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition-fast);
}

.app-import__remove:hover {
  color: #ff5b6a;
  background: rgba(255, 77, 94, 0.12);
}
</style>
