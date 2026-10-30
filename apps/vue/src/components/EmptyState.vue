<script setup lang="ts">
defineProps<{ icon?: string; title: string; body?: string }>()
</script>

<template>
  <div class="text-center py-12 px-4" data-testid="empty-state">
    <v-icon :icon="icon ?? 'mdi-inbox-outline'" size="48" class="mb-3 text-medium-emphasis" />
    <div class="text-h6">{{ title }}</div>
    <div v-if="body" class="text-body-2 text-medium-emphasis mt-1">{{ body }}</div>
    <div class="mt-4"><slot /></div>
  </div>
</template>
