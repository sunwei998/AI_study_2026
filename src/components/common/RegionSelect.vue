<template>
  <div class="region-select" :class="{ 'region-select--vertical': vertical }">
    <select
      class="region-select-item"
      :class="{ filled: !!modelValue.province }"
      :value="modelValue.province"
      :disabled="disabled"
      @change="onProvince"
    >
      <option value="">{{ $t('auth.selectProvince') }}</option>
      <option v-for="p in provinces" :key="p.code" :value="p.name">{{ p.name }}</option>
    </select>
    <select
      class="region-select-item"
      :class="{ filled: !!modelValue.city }"
      :value="modelValue.city"
      :disabled="disabled || !cityList.length"
      @change="onCity"
    >
      <option value="">{{ $t('auth.selectCity') }}</option>
      <option v-for="c in cityList" :key="c.code" :value="c.name">{{ c.name }}</option>
    </select>
    <select
      class="region-select-item"
      :class="{ filled: !!modelValue.district }"
      :value="modelValue.district"
      :disabled="disabled || !districtList.length"
      @change="onDistrict"
    >
      <option value="">{{ $t('auth.selectDistrict') }}</option>
      <option v-for="d in districtList" :key="d.code" :value="d.name">{{ d.name }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import regionData from '@/assets/maps/region-data.json'

export interface RegionValue {
  province: string
  city: string
  district: string
}

interface RegionNode {
  code: string
  name: string
  children?: RegionNode[]
}

const props = withDefaults(
  defineProps<{
    modelValue: RegionValue
    disabled?: boolean
    vertical?: boolean
  }>(),
  { disabled: false, vertical: false }
)

const emit = defineEmits<{ (e: 'update:modelValue', v: RegionValue): void }>()

const provinces = computed(() => regionData as RegionNode[])

const currentProvince = computed(() =>
  provinces.value.find((p) => p.name === props.modelValue.province)
)
const cityList = computed(() => currentProvince.value?.children ?? [])
const currentCity = computed(() => cityList.value.find((c) => c.name === props.modelValue.city))
const districtList = computed(() => currentCity.value?.children ?? [])

const onProvince = (e: Event) => {
  const name = (e.target as HTMLSelectElement).value
  emit('update:modelValue', { province: name, city: '', district: '' })
}

const onCity = (e: Event) => {
  const name = (e.target as HTMLSelectElement).value
  emit('update:modelValue', {
    province: props.modelValue.province,
    city: name,
    district: ''
  })
}

const onDistrict = (e: Event) => {
  const name = (e.target as HTMLSelectElement).value
  emit('update:modelValue', {
    province: props.modelValue.province,
    city: props.modelValue.city,
    district: name
  })
}
</script>

<style scoped>
.region-select {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.region-select--vertical {
  grid-template-columns: 1fr;
}

.region-select-item {
  height: 44px;
  padding: 0 30px 0 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 13px;
  outline: none;
  cursor: pointer;
  transition: var(--transition-normal);
  appearance: none;
  -webkit-appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--color-text-secondary) 50%),
    linear-gradient(135deg, var(--color-text-secondary) 50%, transparent 50%);
  background-position: calc(100% - 16px) 19px, calc(100% - 11px) 19px;
  background-size: 5px 5px;
  background-repeat: no-repeat;
}

.region-select-item.filled {
  color: var(--color-text);
  border-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-glow);
  background-image: linear-gradient(45deg, transparent 50%, var(--color-primary) 50%),
    linear-gradient(135deg, var(--color-primary) 50%, transparent 50%);
}

.region-select-item:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 10px var(--color-glow);
}

.region-select-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 480px) {
  .region-select {
    grid-template-columns: 1fr;
  }
}
</style>