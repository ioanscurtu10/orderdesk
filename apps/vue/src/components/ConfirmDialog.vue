<script setup lang="ts">
defineProps<{
  modelValue: boolean
  title: string
  body?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  loading?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; confirm: []; cancel: [] }>()
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="440"
    @update:model-value="(v) => (emit('update:modelValue', v), !v && emit('cancel'))"
  >
    <v-card data-testid="confirm-dialog">
      <v-card-title class="text-h6">{{ title }}</v-card-title>
      <v-card-text v-if="body">{{ body }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          data-testid="confirm-cancel"
          @click="(emit('cancel'), emit('update:modelValue', false))"
        >
          {{ cancelText ?? $t('app.cancel') }}
        </v-btn>
        <v-btn
          :color="danger ? 'error' : 'primary'"
          variant="flat"
          :loading="loading"
          data-testid="confirm-ok"
          @click="emit('confirm')"
        >
          {{ confirmText ?? $t('app.confirm') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
