<script setup lang="ts">
defineProps<{ message: string }>()
const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <v-alert type="error" variant="tonal" class="my-4" data-testid="error-state">
    <div class="d-flex align-center flex-wrap ga-3">
      <div class="flex-grow-1">
        <div class="font-weight-medium">{{ $t('app.errorTitle') }}</div>
        <div class="text-body-2">{{ message }}</div>
      </div>
      <v-btn variant="outlined" color="error" prepend-icon="mdi-refresh" @click="emit('retry')">
        {{ $t('app.retry') }}
      </v-btn>
    </div>
  </v-alert>
</template>
